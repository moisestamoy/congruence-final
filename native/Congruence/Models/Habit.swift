import Foundation

/// Los mismos seis ejes que la web (`IdentityAxis` en src/types/index.ts).
enum IdentityAxis: String, CaseIterable, Hashable {
    case physical, emotional, vision, standards, growth, environment

    var label: String {
        switch self {
        case .physical:    return "Físico"
        case .emotional:   return "Emocional"
        case .vision:      return "Visión"
        case .standards:   return "Disciplina"
        case .growth:      return "Crecimiento"
        case .environment: return "Entorno"
        }
    }
}

enum HabitKind: String, Codable, Hashable {
    case boolean
    case numeric
}

/// `rest` = descanso planificado, `emergency` = imprevisto. Un día en pausa no
/// cuenta ni a favor ni en contra: es la regla de gracia de la app.
enum LogStatus: String, Hashable {
    case completed, rest, emergency
}

struct HabitLog: Codable, Hashable {
    var date: String
    var completed: Bool
    var value: Double?
    var pauseReason: String?
    /// Guardado como vino: si la web usa un estado que la nativa no conoce, no
    /// se pierde al volver a escribir.
    var statusRaw: String?
    var extras: [String: JSONValue] = [:]

    var status: LogStatus? {
        get { statusRaw.flatMap(LogStatus.init(rawValue:)) }
        set { statusRaw = newValue?.rawValue }
    }

    var isPaused: Bool { status == .rest || status == .emergency }

    init(date: String, completed: Bool, value: Double? = nil,
         status: LogStatus? = nil, pauseReason: String? = nil) {
        self.date = date
        self.completed = completed
        self.value = value
        self.statusRaw = status?.rawValue
        self.pauseReason = pauseReason
    }

    private static let known: Set<String> = ["date", "completed", "value", "status", "pauseReason"]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        date = try c.decodeIfPresent(String.self, forKey: AnyKey("date")) ?? ""
        completed = try c.decodeIfPresent(Bool.self, forKey: AnyKey("completed")) ?? false
        value = try? c.decodeIfPresent(Double.self, forKey: AnyKey("value"))
        statusRaw = try? c.decodeIfPresent(String.self, forKey: AnyKey("status"))
        pauseReason = try? c.decodeIfPresent(String.self, forKey: AnyKey("pauseReason"))
        extras = try c.extras(excluding: Self.known)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(date, forKey: AnyKey("date"))
        try c.encode(completed, forKey: AnyKey("completed"))
        try c.encodeIfPresent(value, forKey: AnyKey("value"))
        try c.encodeIfPresent(statusRaw, forKey: AnyKey("status"))
        try c.encodeIfPresent(pauseReason, forKey: AnyKey("pauseReason"))
        try c.encodeExtras(extras)
    }
}

/// Mismo formato que `Habit` en la web. Todo campo desconocido va a `extras`
/// y se devuelve intacto: la nativa nunca borra algo que no entiende.
struct Habit: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var subtitle: String?
    var type: HabitKind
    var goal: Double
    var unit: String?
    var color: String
    var icon: String?
    var identityAxisRaw: String?
    var logs: [String: HabitLog]
    var archived: Bool?
    var isDemo: Bool?
    var extras: [String: JSONValue] = [:]

    var identityAxis: IdentityAxis? {
        get { identityAxisRaw.flatMap(IdentityAxis.init(rawValue:)) }
        set { identityAxisRaw = newValue?.rawValue }
    }

    var isArchived: Bool { archived == true }

    init(id: String, title: String, subtitle: String?, type: HabitKind, goal: Double,
         unit: String?, color: String, icon: String?, identityAxis: IdentityAxis?,
         logs: [String: HabitLog], isDemo: Bool?, archived: Bool? = nil) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.type = type
        self.goal = goal
        self.unit = unit
        self.color = color
        self.icon = icon
        self.identityAxisRaw = identityAxis?.rawValue
        self.logs = logs
        self.isDemo = isDemo
        self.archived = archived
    }

    private static let known: Set<String> = [
        "id", "title", "subtitle", "type", "goal", "unit", "color", "icon",
        "identityAxis", "logs", "archived", "isDemo"
    ]

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        id = try c.decode(String.self, forKey: AnyKey("id"))
        title = try c.decodeIfPresent(String.self, forKey: AnyKey("title")) ?? ""
        subtitle = try? c.decodeIfPresent(String.self, forKey: AnyKey("subtitle"))
        type = (try? c.decodeIfPresent(HabitKind.self, forKey: AnyKey("type"))) ?? .boolean
        goal = (try? c.decodeIfPresent(Double.self, forKey: AnyKey("goal"))) ?? 1
        unit = try? c.decodeIfPresent(String.self, forKey: AnyKey("unit"))
        color = (try? c.decodeIfPresent(String.self, forKey: AnyKey("color"))) ?? "#22d3ee"
        icon = try? c.decodeIfPresent(String.self, forKey: AnyKey("icon"))
        identityAxisRaw = try? c.decodeIfPresent(String.self, forKey: AnyKey("identityAxis"))
        logs = (try? c.decodeIfPresent([String: HabitLog].self, forKey: AnyKey("logs"))) ?? [:]
        archived = try? c.decodeIfPresent(Bool.self, forKey: AnyKey("archived"))
        isDemo = try? c.decodeIfPresent(Bool.self, forKey: AnyKey("isDemo"))
        extras = try c.extras(excluding: Self.known)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(id, forKey: AnyKey("id"))
        try c.encode(title, forKey: AnyKey("title"))
        try c.encodeIfPresent(subtitle, forKey: AnyKey("subtitle"))
        try c.encode(type, forKey: AnyKey("type"))
        try c.encode(goal, forKey: AnyKey("goal"))
        try c.encodeIfPresent(unit, forKey: AnyKey("unit"))
        try c.encode(color, forKey: AnyKey("color"))
        try c.encodeIfPresent(icon, forKey: AnyKey("icon"))
        try c.encodeIfPresent(identityAxisRaw, forKey: AnyKey("identityAxis"))
        try c.encode(logs, forKey: AnyKey("logs"))
        try c.encodeIfPresent(archived, forKey: AnyKey("archived"))
        try c.encodeIfPresent(isDemo, forKey: AnyKey("isDemo"))
        try c.encodeExtras(extras)
    }

    func log(on day: String) -> HabitLog? { logs[day] }

    func progress(on day: String) -> Double {
        guard let log = logs[day] else { return 0 }
        switch type {
        case .boolean:
            return log.completed ? 1 : 0
        case .numeric:
            guard goal > 0 else { return log.completed ? 1 : 0 }
            return min((log.value ?? 0) / goal, 1)
        }
    }
}

// MARK: - El día de hábitos arranca a las 5 AM

enum HabitDay {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Antes de las 5 AM seguís en el día anterior — igual que `getHabitDay()` en la web.
    static func current(_ now: Date = Date()) -> Date {
        let hour = Calendar.current.component(.hour, from: now)
        return hour < 5 ? Calendar.current.date(byAdding: .day, value: -1, to: now)! : now
    }

    static func key(_ date: Date) -> String { formatter.string(from: date) }

    static func adding(_ days: Int, to date: Date) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: date)!
    }
}
