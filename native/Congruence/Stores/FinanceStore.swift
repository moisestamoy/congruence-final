import Foundation
import Observation

/// Dónde vive un movimiento: los ingresos y los gastos fijos/recurrentes son
/// `events`; los gastos puntuales que registrás son `realExpenses`.
enum TransactionSource: Hashable {
    case event, realExpense
}

/// Un movimiento tal como se ve en un día, venga de donde venga.
struct DayTransaction: Identifiable, Hashable {
    let id: String
    let source: TransactionSource
    let type: FlowType
    let amount: Double
    let category: String
    let note: String?
    let isRecurring: Bool
    /// Fecha original del movimiento. En un recurrente es el primer mes, no el
    /// día que estás mirando.
    let date: String
}

@Observable
final class FinanceStore {
    private(set) var document: FinancesDocument

    /// Gastos borrados acá que la nube todavía puede tener. Se guardan en disco
    /// hasta que una subida los confirme: si no, la próxima bajada los resucita.
    private(set) var deletedExpenseIds: Set<String>

    @ObservationIgnored var onLocalChange: (() -> Void)?

    private let fileURL: URL
    private let tombstonesURL: URL

    init(directory: URL? = nil) {
        let dir = directory ?? FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        fileURL = dir.appendingPathComponent("finances.json")
        tombstonesURL = dir.appendingPathComponent("finances-deleted.json")

        if let data = try? Data(contentsOf: fileURL),
           let doc = try? JSONDecoder().decode(FinancesDocument.self, from: data) {
            document = doc
        } else {
            document = .empty
        }
        if let data = try? Data(contentsOf: tombstonesURL),
           let ids = try? JSONDecoder().decode([String].self, from: data) {
            deletedExpenseIds = Set(ids)
        } else {
            deletedExpenseIds = []
        }
    }

    // MARK: - Persistencia

    private func writeToDisk() {
        if let data = try? JSONEncoder().encode(document) {
            try? data.write(to: fileURL, options: .atomic)
        }
        if let data = try? JSONEncoder().encode(Array(deletedExpenseIds)) {
            try? data.write(to: tombstonesURL, options: .atomic)
        }
    }

    private func commit() {
        writeToDisk()
        onLocalChange?()
    }

    /// Versión de la nube: reemplaza todo sin avisar (si avisara, la volvería a subir).
    func adoptRemote(_ remote: FinancesDocument) {
        var clean = remote
        clean.raw.removeValue(forKey: "_forceAdoptAt")   // como la web: la marca no va al store
        if !deletedExpenseIds.isEmpty {
            clean.realExpenses = clean.realExpenses.filter { !deletedExpenseIds.contains($0.id) }
        }
        document = clean
        writeToDisk()
    }

    /// La subida se confirmó: los borrados ya no están en la nube.
    func clearTombstones() {
        deletedExpenseIds = []
        writeToDisk()
    }

    // MARK: - Lectura

    func transactions(on dateStr: String) -> [DayTransaction] {
        let events = FinanceEngine.events(document.events, on: dateStr).map {
            DayTransaction(id: $0.id, source: .event, type: $0.type, amount: $0.amount,
                           category: $0.category, note: $0.note, isRecurring: $0.isRecurring,
                           date: $0.date)
        }
        let real = document.realExpenses.filter { $0.date == dateStr }.map {
            DayTransaction(id: $0.id, source: .realExpense, type: .expense, amount: $0.amount,
                           category: $0.category, note: $0.note, isRecurring: false, date: $0.date)
        }
        return events + real
    }

    // MARK: - Mutaciones (addTransaction / updateTransaction / … de useFinanceStore.ts)

    /// Los ingresos y todo lo recurrente van a `events` (así el motor los repite
    /// cada mes); un gasto puntual va a `realExpenses`.
    func add(date: String, type: FlowType, amount: Double, category: String,
             isRecurring: Bool, note: String?) {
        let note = note?.isEmpty == true ? nil : note
        if type == .income || isRecurring {
            var events = document.events
            events.append(FinancialEvent(date: date, type: type, amount: amount,
                                         category: category, isRecurring: isRecurring, note: note))
            document.events = events
        } else {
            var real = document.realExpenses
            real.append(DailyRealExpense(date: date, amount: amount,
                                         category: category.isEmpty ? "📦 Otros" : category,
                                         note: note))
            document.realExpenses = real
        }
        commit()
    }

    func update(_ tx: DayTransaction, date: String, type: FlowType, amount: Double,
                category: String, isRecurring: Bool, note: String?) {
        let note = note?.isEmpty == true ? nil : note
        switch tx.source {
        case .event:
            var events = document.events
            guard let i = events.firstIndex(where: { $0.id == tx.id }) else { return }
            events[i].date = date
            events[i].type = type
            events[i].amount = amount
            events[i].category = category
            events[i].isRecurring = isRecurring
            events[i].note = note
            document.events = events

        case .realExpense:
            var real = document.realExpenses
            guard let i = real.firstIndex(where: { $0.id == tx.id }) else { return }
            if isRecurring || type == .income {
                // Pasa a ser un evento (fijo recurrente o ingreso). Mantiene el id,
                // y el gasto puntual queda marcado como borrado para la nube.
                let moved = real.remove(at: i)
                var events = document.events
                var event = FinancialEvent(id: moved.id, date: date, type: type, amount: amount,
                                           category: category, isRecurring: isRecurring, note: note)
                event.raw = moved.raw.merging(event.raw) { _, new in new }
                event.raw.removeValue(forKey: "note")
                event.note = note
                events.append(event)
                document.events = events
                document.realExpenses = real
                deletedExpenseIds.insert(moved.id)
            } else {
                real[i].date = date
                real[i].amount = amount
                real[i].category = category
                real[i].note = note
                document.realExpenses = real
            }
        }
        commit()
    }

    func delete(_ tx: DayTransaction) {
        switch tx.source {
        case .event:
            document.events = document.events.filter { $0.id != tx.id }
        case .realExpense:
            document.realExpenses = document.realExpenses.filter { $0.id != tx.id }
            deletedExpenseIds.insert(tx.id)
        }
        commit()
    }

    /// El presupuesto diario de un día puntual (la columna DIARIO).
    func setDailyBudget(_ budget: Double, on dateStr: String) {
        var overrides = document.overrides.filter { $0.date != dateStr }
        overrides.append(DailyOverride(date: dateStr, budget: max(0, budget)))
        document.overrides = overrides
        commit()
    }

    /// "Saldo actual": se recalcula el saldo inicial para que hoy dé lo que
    /// ingresaste, sin restar dos veces lo ya gastado (saveCurrentBalance en la web).
    /// A diferencia de la web, usa la proyección de hoy aunque estés mirando otro mes.
    func setCurrentBalance(_ value: Double, now: Date = Date()) {
        var config = document.config
        if let today = FinanceEngine.today(doc: document, now: now) {
            let flowToToday = today.balance - config.initialBalance
            config.initialBalance = value - flowToToday
        } else {
            config.initialBalance = value
        }
        config.actualBalanceDisplay = value
        document.config = config
        commit()
    }

    /// El presupuesto mensual desde un mes en adelante (setMonthlyDailyBudget):
    /// borra los ajustes diarios de ese mes para que rija el nuevo promedio.
    func setMonthlyBudget(_ total: Double, year: Int, month: Int) {
        let ym = String(format: "%04d-%02d", year, month)
        var config = document.config
        config.monthlyFixedBudget = total
        var changes = config.budgetChanges
        changes[ym] = total
        config.budgetChanges = changes
        document.config = config
        document.overrides = document.overrides.filter { !$0.date.hasPrefix(ym + "-") }
        commit()
    }
}
