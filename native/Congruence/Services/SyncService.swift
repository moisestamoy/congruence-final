import Foundation
import Observation
import CryptoKit

/// Sincroniza `habits_data` con Supabase siguiendo las mismas reglas que la web
/// (src/features/sync/SupabaseSync.tsx), más algunas de seguridad propias:
///
/// 1. Nunca sube nada antes de haber bajado con éxito al menos una vez. Si la
///    lectura falla o no se entiende, no se escribe: así un error nunca puede
///    pisar tu cuenta con los datos locales.
/// 2. Al entrar con tu cuenta, la nube manda: se adopta tal cual.
/// 3. Después, igual que la web: si hay cambios locales sin subir, ganan los
///    locales; si no, se adopta lo que haya en la nube.
/// 4. Sólo toca la columna `habits_data`. Nunca `finances_data`, `tasks_data`
///    ni `updated_at` — ese sello lo usa la web para resolver conflictos de
///    Finanzas, y moverlo desde acá podría hacerle descartar cambios.
/// 5. Cada versión distinta que baja de la nube se guarda en
///    Application Support/Congruence/backups (las últimas 20).
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

    private let store: HabitStore
    private let auth: AuthService

    private var hasPulled = false
    private var pushTask: Task<Void, Never>?
    private var isPushing = false

    private var pendingLocal: Bool {
        get { UserDefaults.standard.bool(forKey: "sync.pendingLocal") }
        set { UserDefaults.standard.set(newValue, forKey: "sync.pendingLocal") }
    }

    private var lastSyncedHash: String? {
        get { UserDefaults.standard.string(forKey: "sync.lastHash") }
        set { UserDefaults.standard.set(newValue, forKey: "sync.lastHash") }
    }

    init(store: HabitStore, auth: AuthService) {
        self.store = store
        self.auth = auth
        self.status = auth.isSignedIn ? .syncing : .signedOut
        store.onLocalChange = { [weak self] in
            Task { @MainActor in self?.localChanged() }
        }
    }

    // MARK: - Ciclo

    /// Al abrir la app y cada vez que vuelve a primer plano.
    func refresh() async {
        guard auth.isSignedIn else { status = .signedOut; return }
        await pull(adoptUnconditionally: false)
    }

    /// Recién entraste con tu cuenta: lo de la nube reemplaza lo local.
    func didSignIn() async {
        pendingLocal = false
        lastSyncedHash = nil
        hasPulled = false
        await pull(adoptUnconditionally: true)
    }

    func signOut() {
        pushTask?.cancel()
        auth.signOut()
        hasPulled = false
        pendingLocal = false
        lastSyncedHash = nil
        status = .signedOut
    }

    private func localChanged() {
        guard auth.isSignedIn else { return }
        pendingLocal = true
        pushTask?.cancel()
        pushTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard !Task.isCancelled else { return }
            await self?.push()
        }
    }

    // MARK: - Bajar

    private func pull(adoptUnconditionally: Bool) async {
        status = .syncing
        do {
            let remote = try await fetchRemote()
            hasPulled = true

            guard let remote else {
                // La cuenta no tiene hábitos guardados todavía: subimos los locales.
                pendingLocal = true
                await push()
                return
            }

            let remoteHash = Self.hash(remote)
            if adoptUnconditionally || !pendingLocal {
                if adoptUnconditionally || remoteHash != lastSyncedHash {
                    store.adoptRemote(remote)
                }
                lastSyncedHash = remoteHash
                pendingLocal = false
                status = .synced(Date())
            } else {
                // Hay cambios locales sin subir: ganan, igual que en la web.
                await push()
            }
        } catch {
            status = .error(Self.describe(error))
        }
    }

    // MARK: - Subir

    private func push() async {
        guard auth.isSignedIn, hasPulled, pendingLocal, !isPushing else { return }
        isPushing = true
        defer { isPushing = false }
        status = .syncing

        let document = store.document
        do {
            try await writeRemote(document)
            lastSyncedHash = Self.hash(document)
            // Si hubo otro cambio mientras subía, queda pendiente para la próxima.
            if store.document == document { pendingLocal = false }
            status = .synced(Date())
            if pendingLocal { localChanged() }
        } catch {
            status = .error(Self.describe(error))
        }
    }

    // MARK: - REST

    private struct Row: Decodable { let habits_data: JSONValue? }

    private func fetchRemote() async throws -> HabitsDocument? {
        let data = try await request("GET", query: "select=habits_data")
        let rows = try JSONDecoder().decode([Row].self, from: data)

        guard let row = rows.first else {
            // No existe la fila (cuenta nueva): la creamos vacía, como la web.
            try await insertEmptyRow()
            return nil
        }
        guard let raw = row.habits_data, case .object(let object) = raw, !object.isEmpty else {
            return nil
        }

        let json = try JSONEncoder().encode(raw)
        let document = try JSONDecoder().decode(HabitsDocument.self, from: json)
        backup(json, hash: Self.hash(document))
        return document
    }

    private func writeRemote(_ document: HabitsDocument) async throws {
        let body = try JSONEncoder().encode(["habits_data": document])
        let data = try await request("PATCH", query: "select=id", body: body,
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

    private func backup(_ json: Data, hash: String) {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence/backups", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

        // Sólo versiones distintas: si guardara una por cada apertura de la
        // app, en un día las 20 serían copias iguales y se perdería la historia.
        let marker = dir.appendingPathComponent(".last-hash")
        if (try? String(contentsOf: marker, encoding: .utf8)) == hash { return }

        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMdd-HHmmss"
        try? json.write(to: dir.appendingPathComponent("habits-\(f.string(from: Date())).json"))
        try? hash.write(to: marker, atomically: true, encoding: .utf8)

        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil))?
            .filter { $0.lastPathComponent.hasPrefix("habits-") }
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

    static func hash(_ document: HabitsDocument) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        let data = (try? encoder.encode(document)) ?? Data()
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }

    private static func describe(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? "No se pudo sincronizar."
    }
}
