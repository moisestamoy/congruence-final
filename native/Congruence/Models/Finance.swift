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
    var note: String { string("note") ?? "" }

    /// Un aporte nuevo, fechado ahora, con la misma forma que los de la web.
    init(amount: Double, note: String) {
        raw = [:]
        set("id", .string(UUID().uuidString))
        set("date", .string(ISO8601DateFormatter().string(from: Date())))
        set("amount", .number(amount))
        if !note.isEmpty { set("note", .string(note)) }
    }

    var parsedDate: Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: date) ?? ISO8601DateFormatter().date(from: date)
    }
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
    var cycleStartYearMonth: String? {
        get { string("cycleStartYearMonth") }
        set { set("cycleStartYearMonth", .from(newValue)) }
    }
    var currency: String? {
        get { string("currency") }
        set { set("currency", .from(newValue)) }
    }
    var currencyLocale: String? {
        get { string("currencyLocale") }
        set { set("currencyLocale", .from(newValue)) }
    }
}

/// Las monedas que ofrece la web (CURRENCIES en BudgetModal.tsx), con el
/// mismo código y la misma configuración regional, para que las dos apps
/// escriban exactamente lo mismo.
enum Currency: String, CaseIterable, Identifiable {
    case EUR, USD, MXN, COP, GBP, BRL
    var id: String { rawValue }

    var locale: String {
        switch self {
        case .EUR: return "de-DE"
        case .USD: return "en-US"
        case .MXN: return "es-MX"
        case .COP: return "es-CO"
        case .GBP: return "en-GB"
        case .BRL: return "pt-BR"
        }
    }
    var symbol: String { Money.symbol(for: rawValue) }
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
    var savingsEntries: [SavingsEntry] {
        get { [SavingsEntry](json: raw["savingsEntries"]) }
        set { raw["savingsEntries"] = newValue.json }
    }

    var annualGoal: Double {
        get {
            let v = raw["savingsGoals"]?.objectValue?["annual"]?.doubleValue ?? 20000
            return v == 0 ? 20000 : v   // `savingsGoals?.annual || 20000` en la web
        }
        set { setGoal("annual", newValue) }
    }
    var monthlyGoal: Double {
        get { raw["savingsGoals"]?.objectValue?["monthly"]?.doubleValue ?? 0 }
        set { setGoal("monthly", newValue) }
    }

    /// Cambia una meta sin pisar la otra, como el `{...state.savingsGoals}` de la web.
    private mutating func setGoal(_ key: String, _ value: Double) {
        var goals = raw["savingsGoals"]?.objectValue ?? [:]
        goals[key] = .number(value)
        raw["savingsGoals"] = .object(goals)
    }

    /// Límite de gasto mensual por categoría. 0 o ausente es "sin límite".
    /// Los fijos que ya pagaste, como "idDelMovimiento|AAAA-MM": un mismo
    /// arriendo recurrente se paga una vez por mes. Campo propio de la app
    /// nativa; la web no lo conoce y lo deja pasar.
    var paidFixed: Set<String> {
        get { Set((raw["paidFixed"]?.arrayValue ?? []).compactMap(\.stringValue)) }
        set { raw["paidFixed"] = .array(newValue.sorted().map { .string($0) }) }
    }

    var categoryBudgets: [String: Double] {
        get {
            (raw["categoryBudgets"]?.objectValue ?? [:]).compactMapValues(\.doubleValue)
        }
        set { raw["categoryBudgets"] = .object(newValue.mapValues { .number($0) }) }
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

    /// Adivina la categoría por las palabras. Una suposición razonable ahorra
    /// elegir de una lista de diecisiete cada vez; si falla, se cambia.
    static func guess(_ texto: String, income: Bool) -> String {
        let t = texto.lowercased().folding(options: .diacriticInsensitive, locale: nil)
        let palabrasTexto = t.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        // Las claves cortas tienen que ser la palabra entera ("ara" no es
        // "para"); las largas alcanzan como comienzo ("super" en "supermercado").
        func tiene(_ claves: [String]) -> Bool {
            claves.contains { clave in
                if clave.contains(" ") { return t.contains(clave) }
                return palabrasTexto.contains { clave.count <= 4 ? $0 == clave : $0.hasPrefix(clave) }
            }
        }
        if income {
            if tiene(["comision"]) { return "🤝 Comisiones" }
            if tiene(["prestamo"]) { return "🏦 Préstamo" }
            if tiene(["inversion", "dividendo", "interes"]) { return "📈 Inversiones" }
            if tiene(["regalo"]) { return "🎁 Regalo" }
            if tiene(["sueldo", "salario", "nomina", "pago", "cliente", "factura"]) { return "💰 Salario" }
            return "🪙 Otros ingresos"
        }
        let reglas: [([String], String)] = [
            (["arriendo", "alquiler", "renta", "hipoteca"], "🏠 Alquiler"),
            (["luz", "agua", "gas", "internet", "telefono", "celular", "plan movil", "servicio"], "💡 Servicios"),
            (["netflix", "spotify", "youtube", "icloud", "chatgpt", "claude", "suscripcion", "prime", "disney", "hbo"], "🔄 Suscripciones"),
            (["tarjeta"], "💳 Tarjeta de crédito"),
            (["super", "mercado", "d1", "exito", "carulla", "jumbo", "ara"], "🛒 Supermercado"),
            (["uber", "didi", "taxi", "bus", "metro", "gasolina", "transporte", "parqueadero", "peaje"], "🚕 Transporte"),
            (["cafe", "almuerzo", "comida", "cena", "desayuno", "rappi", "restaurante", "pizza", "burger", "hamburguesa"], "🍔 Comida"),
            (["cine", "fiesta", "bar", "salida", "juego", "concierto"], "🎬 Entretenimiento"),
            (["medico", "farmacia", "drogueria", "gimnasio", "gym", "doctor", "salud"], "💊 Salud"),
            (["curso", "libro", "clase", "universidad"], "📚 Educación"),
            (["perro", "gato", "veterinario", "mascota"], "🐾 Mascotas"),
            (["vuelo", "hotel", "viaje", "airbnb"], "✈️ Viajes"),
            (["computador", "laptop", "iphone", "celular nuevo", "software"], "💻 Tecnología"),
            (["mentoria", "coach"], "🧠 Inversión en mentoría"),
        ]
        return reglas.first { tiene($0.0) }?.1 ?? "📦 Otros"
    }
}


// MARK: - Un gasto escrito de corrido

/// "12 café", "café 12", "$8.50 uber", "arriendo 1,500": un monto y unas
/// pocas palabras. Es lo que entiende la captura rápida como gasto.
enum QuickExpense {
    struct Parsed: Equatable {
        let amount: Double
        let what: String
        let category: String
    }

    private static let monto = #"\$?\s*(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)"#

    static func parse(_ texto: String) -> Parsed? {
        let t = texto.trimmingCharacters(in: .whitespaces)
        let patrones = ["^" + monto + #"\s+(.+)$"#, #"^(.+?)\s+"# + monto + "$"]
        for (i, patron) in patrones.enumerated() {
            guard let re = try? NSRegularExpression(pattern: patron),
                  let m = re.firstMatch(in: t, range: NSRange(t.startIndex..., in: t)),
                  let r1 = Range(m.range(at: 1), in: t), let r2 = Range(m.range(at: 2), in: t)
            else { continue }
            let (montoTexto, que) = i == 0 ? (String(t[r1]), String(t[r2])) : (String(t[r2]), String(t[r1]))
            // Más palabras ya es una frase, no un gasto. Con el monto al final
            // se pide menos: "hoy me siento cansado 3" no es un gasto.
            guard que.split(separator: " ").count <= (i == 0 ? 5 : 3),
                  que.rangeOfCharacter(from: .decimalDigits) == nil,
                  let valor = number(montoTexto), valor > 0
            else { continue }
            return Parsed(amount: valor, what: que,
                          category: FinanceCategories.guess(que, income: false))
        }
        return nil
    }

    /// Cómo se muestra el monto en la vista previa, sin saber la moneda.
    static func format(_ n: Double, symbol: String) -> String {
        n.truncatingRemainder(dividingBy: 1) == 0 ? "\(symbol)\(Int(n))" : symbol + String(format: "%.2f", n)
    }

    /// "1,500" y "1.500" son mil quinientos; "8,50" y "8.50", ocho y medio.
    static func number(_ s: String) -> Double? {
        var t = s.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: " ", with: "")
        if let ultimo = t.lastIndex(where: { $0 == "," || $0 == "." }) {
            let decimales = t.distance(from: ultimo, to: t.endIndex) - 1
            if decimales == 3 {
                t.removeAll { $0 == "," || $0 == "." }
            } else {
                let entero = t[..<ultimo].filter { $0.isNumber }
                t = entero + "." + t[t.index(after: ultimo)...]
            }
        }
        return Double(t)
    }
}
