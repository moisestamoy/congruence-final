import Foundation

enum FlowType: String, Hashable {
    case income, expense
}

/// `FinancialEvent` de la web: ingresos, y gastos fijos o recurrentes.
struct FinancialEvent: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    init(id: String = UUID().uuidString, date: String, type: FlowType, amount: Double,
         category: String, isRecurring: Bool, note: String? = nil) {
        raw = [:]
        self.id = id; self.date = date; self.type = type
        self.amount = amount; self.category = category; self.isRecurring = isRecurring
        self.note = note
    }

    var id: String { get { string("id") ?? "" } set { set("id", .string(newValue)) } }
    var date: String { get { string("date") ?? "" } set { set("date", .string(newValue)) } }
    var type: FlowType {
        get { FlowType(rawValue: string("type") ?? "") ?? .expense }
        set { set("type", .string(newValue.rawValue)) }
    }
    var amount: Double { get { double("amount") ?? 0 } set { set("amount", .number(newValue)) } }
    var category: String { get { string("category") ?? "" } set { set("category", .string(newValue)) } }
    var isRecurring: Bool { get { bool("isRecurring") ?? false } set { set("isRecurring", .bool(newValue)) } }
    var note: String? { get { string("note") } set { set("note", .from(newValue)) } }
}

/// `DailyRealExpense` de la web: el gasto real que registraste.
struct DailyRealExpense: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    init(id: String = UUID().uuidString, date: String, amount: Double, category: String,
         note: String? = nil) {
        raw = [:]
        self.id = id; self.date = date; self.amount = amount; self.category = category
        self.note = note
    }

    var id: String { get { string("id") ?? "" } set { set("id", .string(newValue)) } }
    var date: String { get { string("date") ?? "" } set { set("date", .string(newValue)) } }
    var amount: Double { get { double("amount") ?? 0 } set { set("amount", .number(newValue)) } }
    var category: String { get { string("category") ?? "" } set { set("category", .string(newValue)) } }
    var note: String? { get { string("note") } set { set("note", .from(newValue)) } }
}

/// `DailyOverride`: el presupuesto diario ajustado a mano para un día.
struct DailyOverride: JSONRecord {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    init(date: String, budget: Double?) {
        raw = [:]
        self.date = date
        self.budget = budget
    }

    var date: String { get { string("date") ?? "" } set { set("date", .string(newValue)) } }
    var budget: Double? { get { double("budget") } set { set("budget", .from(newValue)) } }
}

struct SavingsEntry: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    var id: String { string("id") ?? "" }
    /// ISO completo (con hora), como lo guarda la web.
    var date: String { string("date") ?? "" }
    var amount: Double { double("amount") ?? 0 }
}

/// `FinancialConfig` de la web.
struct FinancialConfig: JSONRecord {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    var initialBalance: Double {
        get { double("initialBalance") ?? 0 }
        set { set("initialBalance", .number(newValue)) }
    }
    var actualBalanceDisplay: Double? {
        get { double("actualBalanceDisplay") }
        set { set("actualBalanceDisplay", .from(newValue)) }
    }
    var monthlyFixedBudget: Double {
        get { double("monthlyFixedBudget") ?? 1500 }
        set { set("monthlyFixedBudget", .number(newValue)) }
    }
    var budgetChanges: [String: Double] {
        get {
            (raw["budgetChanges"]?.objectValue ?? [:]).compactMapValues(\.doubleValue)
        }
        set { set("budgetChanges", .object(newValue.mapValues(JSONValue.number))) }
    }
    var cycleStartYearMonth: String? { string("cycleStartYearMonth") }
    var currency: String? { string("currency") }
    var currencyLocale: String? { string("currencyLocale") }
}

/// Exactamente lo que guarda la columna `finances_data`.
struct FinancesDocument: JSONRecord {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    var config: FinancialConfig {
        get { FinancialConfig(raw: raw["config"]?.objectValue ?? [:]) }
        set { raw["config"] = newValue.json }
    }
    var events: [FinancialEvent] {
        get { [FinancialEvent](json: raw["events"]) }
        set { raw["events"] = newValue.json }
    }
    var overrides: [DailyOverride] {
        get { [DailyOverride](json: raw["overrides"]) }
        set { raw["overrides"] = newValue.json }
    }
    var realExpenses: [DailyRealExpense] {
        get { [DailyRealExpense](json: raw["realExpenses"]) }
        set { raw["realExpenses"] = newValue.json }
    }
    var savingsEntries: [SavingsEntry] { [SavingsEntry](json: raw["savingsEntries"]) }

    var annualGoal: Double {
        let v = raw["savingsGoals"]?.objectValue?["annual"]?.doubleValue ?? 20000
        return v == 0 ? 20000 : v   // `savingsGoals?.annual || 20000` en la web
    }
    var monthlyGoal: Double {
        raw["savingsGoals"]?.objectValue?["monthly"]?.doubleValue ?? 0
    }

    /// Marca que pone una corrección hecha desde el servidor para que todos los
    /// dispositivos adopten la copia de la nube una vez (ver SupabaseSync.tsx).
    var forceAdoptAt: Double { raw["_forceAdoptAt"]?.doubleValue ?? 0 }

    var isEmpty: Bool { raw.isEmpty }

    /// Lo mismo que arranca la web la primera vez, sin los datos de ejemplo.
    static let empty = FinancesDocument(raw: [
        "config": .object([
            "initialBalance": .number(0), "monthlyFixedBudget": .number(1500),
            "cycleStartDate": .number(1), "monthlyIncomeGoal": .number(3000)
        ]),
        "events": .array([]), "overrides": .array([]), "realExpenses": .array([]),
        "savingsGoals": .object(["annual": .number(20000), "monthly": .number(1500)]),
        "savingsEntries": .array([]), "categoryBudgets": .object([:])
    ])
}

// MARK: - Categorías (las mismas de TransactionModal.tsx)

enum FinanceCategories {
    static let income = [
        "💰 Salario", "🤝 Comisiones", "🏦 Préstamo", "📈 Inversiones", "🎁 Regalo",
        "🪙 Otros ingresos"
    ]
    static let expense = [
        "🍔 Comida", "🚕 Transporte", "🎬 Entretenimiento", "💊 Salud", "📚 Educación",
        "📦 Otros", "🏠 Alquiler", "💳 Tarjeta de crédito", "🛒 Supermercado", "💡 Servicios",
        "🔄 Suscripciones", "🐾 Mascotas", "✈️ Viajes", "💻 Tecnología",
        "🛠️ Herramienta de trabajo", "📉 Inversiones", "🧠 Inversión en mentoría"
    ]
}
