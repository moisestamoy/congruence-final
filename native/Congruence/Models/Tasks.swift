import Foundation

/// `TaskPriority` de la web: `null`, `"!"` o `"!!"`.
enum TaskPriority: String, CaseIterable, Hashable {
    case normal = ""
    case medium = "!"
    case high = "!!"

    var weight: Int {
        switch self {
        case .high: return 2
        case .medium: return 1
        case .normal: return 0
        }
    }

    var label: String {
        switch self {
        case .normal: return "Sin prioridad"
        case .medium: return "!"
        case .high: return "!!"
        }
    }
}

/// Las dos formas de ver las tareas.
enum TaskLayout: String, CaseIterable, Hashable {
    case list, board

    var label: String { self == .list ? "Lista" : "Tablero" }
    var symbol: String { self == .list ? "list.bullet" : "rectangle.split.3x1" }
}

/// Las tres columnas del tablero.
///
/// `completed` sigue siendo la verdad sobre si algo está hecho —es lo que
/// entiende la web—, y `inProgress` sólo separa lo empezado de lo que ni
/// arrancó. La web no conoce ese campo, pero tampoco lo pierde: su store
/// actualiza con `{...t, ...updates}`, así que lo que no entiende viaja
/// intacto de vuelta.
enum TaskColumn: String, CaseIterable, Hashable {
    case pending, doing, done

    var label: String {
        switch self {
        case .pending: return "Pendiente"
        case .doing:   return "En progreso"
        case .done:    return "Hecho"
        }
    }
}

/// Una tarea. Se llama `TodoTask` y no `Task` porque `Task` ya existe en Swift
/// (el de la concurrencia) y chocaría en todos lados.
struct TodoTask: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    init(text: String, priority: TaskPriority, deadline: String?, groupId: String?) {
        raw = [:]
        id = UUID().uuidString
        self.text = text
        self.priority = priority
        self.deadline = deadline
        self.groupId = groupId
        completed = false
        set("completedAt", .null)
        set("createdAt", .number(Date().timeIntervalSince1970 * 1000))
    }

    var id: String { get { string("id") ?? "" } set { set("id", .string(newValue)) } }
    var text: String { get { string("text") ?? "" } set { set("text", .string(newValue)) } }

    var priority: TaskPriority {
        get { TaskPriority(rawValue: string("priority") ?? "") ?? .normal }
        set { set("priority", newValue == .normal ? .null : .string(newValue.rawValue)) }
    }
    var deadline: String? {
        get { string("deadline") }
        set { set("deadline", newValue.map(JSONValue.string) ?? .null) }
    }
    var groupId: String? {
        get { string("groupId") }
        set { set("groupId", newValue.map(JSONValue.string) ?? .null) }
    }
    var completed: Bool { get { bool("completed") ?? false } set { set("completed", .bool(newValue)) } }
    /// Milisegundos, como `Date.now()` en la web.
    var completedAt: Double? {
        get { double("completedAt") }
        set { set("completedAt", newValue.map(JSONValue.number) ?? .null) }
    }
    var createdAt: Double { double("createdAt") ?? 0 }

    /// Empezada pero no terminada. Sólo tiene sentido si no está completada.
    var inProgress: Bool {
        get { bool("inProgress") ?? false }
        set { set("inProgress", .bool(newValue)) }
    }

    /// El texto largo de la tarjeta: lo que escribes al abrirla.
    var notes: String {
        get { string("notes") ?? "" }
        set { set("notes", newValue.isEmpty ? .null : .string(newValue)) }
    }

    /// La nota del diario de la que salió, si salió de una. El puente entre
    /// diario y tareas existía en un solo sentido: escribías algo, se volvía
    /// tarea, y la tarea ya no recordaba de dónde venía.
    var fromNote: String? {
        get { string("fromNote") }
        set { set("fromNote", newValue.map(JSONValue.string) ?? .null) }
    }

    /// Posición elegida a mano dentro de su columna del tablero. Sólo existe
    /// si arrastraste algo: hasta entonces la columna se ordena por prioridad.
    /// La web no lo conoce pero no lo pierde.
    var sort: Double? {
        get { double("sort") }
        set { set("sort", newValue.map(JSONValue.number) ?? .null) }
    }

    var column: TaskColumn {
        if completed { return .done }
        return inProgress ? .doing : .pending
    }
}

struct TaskGroup: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    init(name: String, color: String) {
        raw = [:]
        id = UUID().uuidString
        self.name = name
        self.color = color
    }

    var id: String { get { string("id") ?? "" } set { set("id", .string(newValue)) } }
    var name: String { get { string("name") ?? "" } set { set("name", .string(newValue)) } }
    var color: String { get { string("color") ?? "#3aada8" } set { set("color", .string(newValue)) } }
}

/// Una nota del diario.
struct DiaryNote: JSONRecord, Identifiable {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    /// `on` permite fechar la nota en el día que estés mirando, no en hoy.
    init(title: String, content: String, on day: Date = Date()) {
        raw = [:]
        let now = Self.stamp(for: day)
        id = UUID().uuidString
        self.title = title
        self.content = content
        set("createdAt", .number(now))
        set("updatedAt", .number(now))
    }

    var id: String { get { string("id") ?? "" } set { set("id", .string(newValue)) } }
    var title: String { get { string("title") ?? "" } set { set("title", .string(newValue)) } }
    var content: String { get { string("content") ?? "" } set { set("content", .string(newValue)) } }
    var createdAt: Double { double("createdAt") ?? 0 }
    var updatedAt: Double { get { double("updatedAt") ?? 0 } set { set("updatedAt", .number(newValue)) } }

    var date: Date { Date(timeIntervalSince1970: createdAt / 1000) }

    /// Si escribes en un día pasado, la nota se fecha a mediodía de ese día;
    /// si es hoy, lleva la hora real. Así una nota de ayer queda en ayer sin
    /// inventar una hora exacta que nadie vivió.
    private static func stamp(for day: Date) -> Double {
        let cal = Calendar.current
        if cal.isDateInToday(day) { return Date().timeIntervalSince1970 * 1000 }
        let noon = cal.date(bySettingHour: 12, minute: 0, second: 0, of: day) ?? day
        return noon.timeIntervalSince1970 * 1000
    }
}

/// Exactamente lo que guarda la columna `tasks_data`.
struct TasksDocument: JSONRecord {
    var raw: [String: JSONValue]
    init(raw: [String: JSONValue]) { self.raw = raw }

    var tasks: [TodoTask] {
        get { [TodoTask](json: raw["tasks"]) }
        set { raw["tasks"] = newValue.json }
    }
    var groups: [TaskGroup] {
        get { [TaskGroup](json: raw["groups"]) }
        set { raw["groups"] = newValue.json }
    }
    var notes: [DiaryNote] {
        get { [DiaryNote](json: raw["notes"]) }
        set { raw["notes"] = newValue.json }
    }
    var soundEnabled: Bool {
        get { bool("soundEnabled") ?? true }
        set { set("soundEnabled", .bool(newValue)) }
    }

    /// Los grupos con los que arranca la web.
    static let defaultGroups: [(String, String, String)] = [
        ("personal", "Personal", "#3aada8"),
        ("trabajo", "Trabajo", "#5b8dd9"),
        ("salud", "Salud", "#8fbb5a"),
        ("proyectos", "Proyectos", "#c8920a")
    ]

    static let groupPalette = [
        "#e05252", "#e07d3c", "#c8920a", "#8fbb5a", "#4caf7d",
        "#3aada8", "#5b8dd9", "#7c6fcd", "#d95b8a", "#7a8fa6"
    ]

    static var empty: TasksDocument {
        var doc = TasksDocument(raw: [:])
        doc.tasks = []
        doc.groups = defaultGroups.map { id, name, color in
            var g = TaskGroup(name: name, color: color)
            g.id = id
            return g
        }
        doc.notes = []
        doc.soundEnabled = true
        return doc
    }
}
