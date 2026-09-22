import Foundation
import Observation
import CryptoKit

/// Sincroniza `habits_data` y `finances_data` con Supabase siguiendo las reglas
/// de la web (src/features/sync/SupabaseSync.tsx), más algunas de seguridad:
///
/// 1. Nunca sube nada antes de haber bajado con éxito. Si la lectura falla o no
///    se entiende, no se escribe: un error nunca puede pisar la cuenta.
/// 2. Al entrar con la cuenta, la nube manda: se adopta tal cual.
/// 3. Hábitos, igual que la web: si hay cambios locales sin subir ganan; si no,
///    se adopta la nube. Subir hábitos no toca `updated_at`.
/// 4. Finanzas, igual que la web: "el último que editó gana", comparando la
///    hora de la última edición local contra `updated_at` de la nube. Al subir
///    se sella `updated_at`, como hace cualquier dispositivo con la web.
/// 5. Antes de subir finanzas se vuelve a leer la nube y se suman los gastos
///    que no conocemos — los que tu Atajo de iPhone escribe directo en la base —
///    salvo los que borraste acá.
/// 6. Tareas y notas (`tasks_data`) van como los hábitos: sin tocar
///    `updated_at`. `stats_data` no se toca nunca.
/// 7. Cada versión distinta que baja se guarda en
///    Application Support/Congruence/backups (las últimas 20 de cada una).
@MainActor
@Observable
final class SyncService {
    enum Status: Equatable {
        case signedOut
        case syncing
        case synced(Date)
        case error(String)
    }

    private(set) var status: Status

    private let habits: HabitStore
    private let finances: FinanceStore
    private let tasks: TaskStore
    private let auth: AuthService

    private var hasPulled = false
    private var pushTask: Task<Void, Never>?
    private var isPushing = false

    // MARK: Estado persistido

    private let defaults = UserDefaults.standard

    private var habitsPending: Bool {
        get { defaults.bool(forKey: "sync.pendingLocal") }
        set { defaults.set(newValue, forKey: "sync.pendingLocal") }
    }
    private var habitsLastHash: String? {
        get { defaults.string(forKey: "sync.lastHash") }
        set { defaults.set(newValue, forKey: "sync.lastHash") }
    }
    private var tasksPending: Bool {
        get { defaults.bool(forKey: "sync.tasks.pending") }
        set { defaults.set(newValue, forKey: "sync.tasks.pending") }
    }
    private var tasksLastHash: String? {
        get { defaults.string(forKey: "sync.tasks.lastHash") }
        set { defaults.set(newValue, forKey: "sync.tasks.lastHash") }
    }
    private var financesPending: Bool {
        get { defaults.bool(forKey: "sync.fin.pending") }
        set { defaults.set(newValue, forKey: "sync.fin.pending") }
    }
    /// Milisegundos, como `finance_local_edit_at` en la web.
    private var financesLocalEditAt: Double {
        get { defaults.double(forKey: "sync.fin.localEditAt") }
        set { defaults.set(newValue, forKey: "sync.fin.localEditAt") }
    }
    private var financesForceApplied: Double {
        get { defaults.double(forKey: "sync.fin.forceApplied") }
        set { defaults.set(newValue, forKey: "sync.fin.forceApplied") }
    }

    init(habits: HabitStore, finances: FinanceStore, tasks: TaskStore, auth: AuthService) {
        self.habits = habits
        self.finances = finances
        self.tasks = tasks
        self.auth = auth
        self.status = auth.isSignedIn ? .syncing : .signedOut
        habits.onLocalChange = { [weak self] in
            Task { @MainActor in self?.habitsChanged() }
        }
        finances.onLocalChange = { [weak self] in
            Task { @MainActor in self?.financesChanged() }
        }
        tasks.onLocalChange = { [weak self] in
            Task { @MainActor in self?.tasksChanged() }
        }
    }

    // MARK: - Ciclo

    func refresh() async {
        guard auth.isSignedIn else { status = .signedOut; return }
        await pull(adoptUnconditionally: false)
    }

    func didSignIn() async {
        habitsPending = false
        habitsLastHash = nil
        financesPending = false
        financesLocalEditAt = 0
        tasksPending = false
        tasksLastHash = nil
        finances.clearTombstones()
        hasPulled = false
        await pull(adoptUnconditionally: true)
    }

    func signOut() {
        pushTask?.cancel()
        auth.signOut()
        hasPulled = false
        habitsPending = false
        financesPending = false
        tasksPending = false
        status = .signedOut
    }

    private func habitsChanged() {
        guard auth.isSignedIn else { return }
        habitsPending = true
        schedulePush()
    }

    private func tasksChanged() {
        guard auth.isSignedIn else { return }
        tasksPending = true
        schedulePush()
    }

    private func financesChanged() {
        guard auth.isSignedIn else { return }
        financesPending = true
        // Se sella la edición ya, igual que la web: si la app se cierra o se
        // recarga antes de subir, esta edición sigue ganando contra la nube.
        financesLocalEditAt = Date().timeIntervalSince1970 * 1000
        schedulePush()
    }

    private func schedulePush() {
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled else { return }
            await self?.push()
        }
    }

    // MARK: - Bajar

    private func pull(adoptUnconditionally force: Bool) async {
        status = .syncing
        do {
            guard let row = try await fetchRow(columns: "habits_data,finances_data,tasks_data,updated_at") else {
                try await insertEmptyRow()
                hasPulled = true
                habitsPending = true
                financesPending = true
                tasksPending = true
                await push()
                return
            }
            hasPulled = true
            applyHabits(row, force: force)
            applyFinances(row, force: force)
            applyTasks(row, force: force)

            if habitsPending || financesPending || tasksPending {
                await push()
            } else {
                status = .synced(Date())
            }
        } catch {
            status = .error(Self.describe(error))
        }
    }

    private func applyHabits(_ row: Row, force: Bool) {
        guard let remote = row.habits else {
            habitsPending = true   // la nube no tiene hábitos: subimos los locales
            return
        }
        let hash = Self.hash(remote)
        if force || !habitsPending {
            if force || hash != habitsLastHash { habits.adoptRemote(remote) }
            habitsLastHash = hash
            habitsPending = false
        }
    }

    private func applyTasks(_ row: Row, force: Bool) {
        guard let remote = row.tasks else {
            tasksPending = true   // la nube no tiene tareas: subimos las locales
            return
        }
        let hash = Self.hash(remote)
        if force || !tasksPending {
            if force || hash != tasksLastHash { tasks.adoptRemote(remote) }
            tasksLastHash = hash
            tasksPending = false
        }
    }

    private func applyFinances(_ row: Row, force: Bool) {
        guard let remote = row.finances else {
            financesPending = true
            return
        }
        let remoteForceAt = remote.forceAdoptAt
        let mustForce = remoteForceAt > financesForceApplied
        let doForce = force || mustForce
        // 1 ms de tolerancia: la nube guarda la hora truncada al milisegundo y acá
        // tiene decimales; sin margen, la nativa se creería siempre más nueva y
        // volvería a subir en cada apertura.
        let localAhead = !doForce && (financesPending || financesLocalEditAt > row.updatedAt + 1)

        if doForce {
            finances.clearTombstones()
            if mustForce { financesForceApplied = remoteForceAt }
        }

        if localAhead {
            // Tus ediciones locales ganan. Sólo sumamos los gastos que la nube
            // tiene y nosotros no (los del Atajo de iPhone), salvo los borrados.
            let merged = Self.merge(local: finances.document, remote: remote,
                                    deleted: finances.deletedExpenseIds)
            if merged.realExpenses.count != finances.document.realExpenses.count {
                finances.adoptRemote(merged)
            }
            financesPending = true
        } else {
            finances.adoptRemote(remote)
            financesLocalEditAt = row.updatedAt
            financesPending = false
        }
    }

    // MARK: - Subir

    private func push() async {
        guard auth.isSignedIn, hasPulled,
              habitsPending || financesPending || tasksPending, !isPushing else { return }
        isPushing = true
        defer { isPushing = false }
        status = .syncing

        let sendHabits = habitsPending
        let sendFinances = financesPending
        let sendTasks = tasksPending
        let habitsDoc = habits.document
        let tasksDoc = tasks.document

        do {
            var body: [String: JSONValue] = [:]
            if sendHabits {
                body["habits_data"] = try Self.jsonValue(habitsDoc)
            }
            if sendTasks {
                body["tasks_data"] = tasksDoc.json
            }

            let financesBefore = finances.document
            var financesDoc = financesBefore
            let stamp = Date()
            if sendFinances {
                // Releer la nube justo antes de escribir, para no perder gastos
                // que llegaron por otro lado desde la última bajada.
                if let row = try await fetchRow(columns: "finances_data"), let remote = row.finances {
                    financesDoc = Self.merge(local: financesDoc, remote: remote,
                                             deleted: finances.deletedExpenseIds)
                }
                financesDoc.raw.removeValue(forKey: "_forceAdoptAt")
                body["finances_data"] = financesDoc.json
                body["updated_at"] = .string(Self.iso(stamp))
            }

            try await writeRow(body)

            if sendHabits {
                habitsLastHash = Self.hash(habitsDoc)
                if habits.document == habitsDoc { habitsPending = false }
            }
            if sendTasks {
                tasksLastHash = Self.hash(tasksDoc)
                if tasks.document == tasksDoc { tasksPending = false }
            }
            if sendFinances {
                // Si editaste algo mientras subía, eso queda pendiente y no se pisa.
                if finances.document == financesBefore {
                    if financesDoc != financesBefore { finances.adoptRemote(financesDoc) }
                    finances.clearTombstones()
                    financesPending = false
                }
                financesLocalEditAt = stamp.timeIntervalSince1970 * 1000
            }
            status = .synced(Date())
            if habitsPending || financesPending || tasksPending { schedulePush() }
        } catch {
            status = .error(Self.describe(error))
        }
    }

    /// Lo local manda; se suman los gastos que sólo están en la nube y que no
    /// borraste acá. Es la misma fusión que hace la web antes de guardar.
    nonisolated static func merge(local: FinancesDocument, remote: FinancesDocument,
                      deleted: Set<String>) -> FinancesDocument {
        let localIds = Set(local.realExpenses.map(\.id))
        let extra = remote.realExpenses.filter { !localIds.contains($0.id) && !deleted.contains($0.id) }
        guard !extra.isEmpty else { return local }
        var merged = local
        merged.realExpenses = local.realExpenses + extra
        return merged
    }

    // MARK: - REST

    private struct Row {
        var habits: HabitsDocument?
        var finances: FinancesDocument?
        var tasks: TasksDocument?
        /// `updated_at` en milisegundos (0 si no hay).
        var updatedAt: Double
    }

    private func fetchRow(columns: String) async throws -> Row? {
        let data = try await request("GET", query: "select=\(columns)")
        guard let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
              let row = rows.first else { return nil }

        var out = Row(habits: nil, finances: nil, tasks: nil, updatedAt: 0)

        if let raw = row["habits_data"] as? [String: Any], !raw.isEmpty {
            let json = try JSONSerialization.data(withJSONObject: raw)
            let doc = try JSONDecoder().decode(HabitsDocument.self, from: json)
            backup(json, name: "habits", hash: Self.hash(doc))
            out.habits = doc
        }
        if let raw = row["finances_data"] as? [String: Any], !raw.isEmpty {
            let json = try JSONSerialization.data(withJSONObject: raw)
            let doc = try JSONDecoder().decode(FinancesDocument.self, from: json)
            backup(json, name: "finances", hash: Self.hash(doc))
            out.finances = doc
        }
        if let raw = row["tasks_data"] as? [String: Any], !raw.isEmpty {
            let json = try JSONSerialization.data(withJSONObject: raw)
            let doc = try JSONDecoder().decode(TasksDocument.self, from: json)
            backup(json, name: "tasks", hash: Self.hash(doc))
            out.tasks = doc
        }
        if let stamp = row["updated_at"] as? String {
            out.updatedAt = (Self.parseISO(stamp)?.timeIntervalSince1970 ?? 0) * 1000
        }
        return out
    }

    private func writeRow(_ body: [String: JSONValue]) async throws {
        let payload = try JSONEncoder().encode(body)
        let data = try await request("PATCH", query: "select=id", body: payload,
                                     prefer: "return=representation")
        let rows = (try? JSONSerialization.jsonObject(with: data)) as? [Any] ?? []
        if rows.isEmpty { throw SyncError.nothingUpdated }
    }

    private func insertEmptyRow() async throws {
        guard let userId = auth.session?.userId else { throw AuthError.sessionExpired }
        let body = try JSONEncoder().encode(["id": userId])
        _ = try await request("POST", query: nil, body: body, filterById: false,
                              prefer: "return=minimal")
    }

    private func request(_ method: String, query: String?, body: Data? = nil,
                         filterById: Bool = true, prefer: String? = nil,
                         isRetry: Bool = false) async throws -> Data {
        guard let userId = auth.session?.userId else { throw AuthError.sessionExpired }
        let token = try await auth.validAccessToken()

        var comps = URLComponents(url: SupabaseConfig.url.appendingPathComponent("rest/v1/user_data"),
                                  resolvingAgainstBaseURL: false)!
        var items: [URLQueryItem] = []
        if filterById { items.append(URLQueryItem(name: "id", value: "eq.\(userId)")) }
        if let query {
            for pair in query.split(separator: "&") {
                let kv = pair.split(separator: "=", maxSplits: 1).map(String.init)
                items.append(URLQueryItem(name: kv[0], value: kv.count > 1 ? kv[1] : nil))
            }
        }
        comps.queryItems = items.isEmpty ? nil : items

        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        req.setValue(SupabaseConfig.publishableKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let prefer { req.setValue(prefer, forHTTPHeaderField: "Prefer") }
        req.httpBody = body

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            throw AuthError.network
        }

        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        if code == 401 && !isRetry {
            try await auth.refresh()
            return try await request(method, query: query, body: body, filterById: filterById,
                                     prefer: prefer, isRetry: true)
        }
        guard (200..<300).contains(code) else {
            throw SyncError.http(code, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }

    // MARK: - Copias de seguridad

    private func backup(_ json: Data, name: String, hash: String) {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence/backups", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        // Sólo versiones distintas, para que 20 copias sean 20 momentos distintos.
        let marker = dir.appendingPathComponent(".last-\(name)-hash")
        if (try? String(contentsOf: marker, encoding: .utf8)) == hash { return }

        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMdd-HHmmss"
        try? json.write(to: dir.appendingPathComponent("\(name)-\(f.string(from: Date())).json"))
        try? hash.write(to: marker, atomically: true, encoding: .utf8)

        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil))?
            .filter { $0.lastPathComponent.hasPrefix("\(name)-") }
            .sorted { $0.lastPathComponent > $1.lastPathComponent } ?? []
        for old in files.dropFirst(20) { try? FileManager.default.removeItem(at: old) }
    }

    // MARK: - Utilidades

    enum SyncError: LocalizedError {
        case nothingUpdated
        case http(Int, String)

        var errorDescription: String? {
            switch self {
            case .nothingUpdated: return "La nube no aceptó el cambio."
            case .http(let code, _): return "Error \(code) de Supabase."
            }
        }
    }

    static func hash<T: Encodable>(_ value: T) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let data = (try? encoder.encode(value)) ?? Data()
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    static func jsonValue<T: Encodable>(_ value: T) throws -> JSONValue {
        try JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(value))
    }

    static func iso(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: date)
    }

    /// Postgres devuelve cosas como "2026-07-01T12:42:12.928+00:00".
    static func parseISO(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }

    private static func describe(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? "No se pudo sincronizar."
    }
}
