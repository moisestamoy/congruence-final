import Foundation
import Observation

@Observable
final class TaskStore {
    private(set) var document: TasksDocument

    @ObservationIgnored var onLocalChange: (() -> Void)?

    private let fileURL: URL

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? TaskStore.defaultFileURL()
        if let data = try? Data(contentsOf: self.fileURL),
           let doc = try? JSONDecoder().decode(TasksDocument.self, from: data) {
            document = doc
        } else {
            document = .empty
        }
    }

    private static func defaultFileURL() -> URL {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("tasks.json")
    }

    private func writeToDisk() {
        guard let data = try? JSONEncoder().encode(document) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func commit() {
        writeToDisk()
        onLocalChange?()
    }

    func adoptRemote(_ remote: TasksDocument) {
        document = remote
        writeToDisk()
    }

    // MARK: - Listas (mismas reglas que ToDoPage.tsx)

    /// Sólo las pendientes: en esta app una tarea completada desaparece.
    /// Ordena por prioridad y, a igual prioridad, por antigüedad.
    func pending(groupId: String? = nil, onlyPriority: Bool = false) -> [TodoTask] {
        document.tasks
            .filter { !$0.completed }
            .filter { groupId == nil || $0.groupId == groupId }
            .filter { !onlyPriority || $0.priority != .normal }
            .sorted {
                $0.priority.weight != $1.priority.weight
                    ? $0.priority.weight > $1.priority.weight
                    : $0.createdAt < $1.createdAt
            }
    }

    /// Agrupadas, en el orden en que están los grupos; las sueltas al final.
    func grouped(groupId: String? = nil, onlyPriority: Bool = false) -> [(group: TaskGroup?, tasks: [TodoTask])] {
        let list = pending(groupId: groupId, onlyPriority: onlyPriority)
        let groups = document.groups
        var buckets: [String: [TodoTask]] = [:]
        var loose: [TodoTask] = []
        for t in list {
            if let g = t.groupId, groups.contains(where: { $0.id == g }) {
                buckets[g, default: []].append(t)
            } else {
                loose.append(t)
            }
        }
        var out: [(TaskGroup?, [TodoTask])] = groups.compactMap { g in
            guard let tasks = buckets[g.id] else { return nil }
            return (g, tasks)
        }
        if !loose.isEmpty { out.append((nil, loose)) }
        return out.map { (group: $0.0, tasks: $0.1) }
    }

    /// Lo de hoy: pendientes que vencen hoy o que ya vencieron.
    func dueToday(_ now: Date = Date()) -> [TodoTask] {
        let today = HabitDay.key(now)
        return document.tasks
            .filter { !$0.completed }
            .filter { guard let d = $0.deadline else { return false }; return d <= today }
            .sorted { ($0.deadline ?? "") < ($1.deadline ?? "") }
    }

    /// Lo que completaste hoy, lo último primero: es lo que se puede deshacer.
    func doneToday(_ now: Date = Date()) -> [TodoTask] {
        let today = HabitDay.key(now)
        return document.tasks
            .filter {
                guard $0.completed, let at = $0.completedAt else { return false }
                return HabitDay.key(Date(timeIntervalSince1970: at / 1000)) == today
            }
            .sorted { ($0.completedAt ?? 0) > ($1.completedAt ?? 0) }
    }

    func completedToday(_ now: Date = Date()) -> Int { doneToday(now).count }

    func group(_ id: String?) -> TaskGroup? {
        guard let id else { return nil }
        return document.groups.first { $0.id == id }
    }

    // MARK: - Tareas

    func addTask(text: String, priority: TaskPriority, deadline: String?,
                 groupId: String?, column: TaskColumn = .pending) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        var task = TodoTask(text: text, priority: priority,
                            deadline: deadline, groupId: groupId)
        // Crear desde una columna del tablero la deja ya en ese estado:
        // hacer clic en "En progreso" es decir que ya empezaste.
        switch column {
        case .pending: break
        case .doing:   task.inProgress = true
        case .done:
            task.completed = true
            task.completedAt = Date().timeIntervalSince1970 * 1000
        }
        document.tasks.append(task)
        commit()
    }

    func toggleTask(_ id: String) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }) else { return }
        let nowDone = !document.tasks[i].completed
        document.tasks[i].completed = nowDone
        document.tasks[i].completedAt = nowDone ? Date().timeIntervalSince1970 * 1000 : nil
        commit()
    }

    /// Mueve una tarea de columna. Salir de "Hecho" limpia `completedAt`,
    /// para que no siga contando como completada hoy.
    func setColumn(_ column: TaskColumn, for id: String) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }),
              document.tasks[i].column != column else { return }
        switch column {
        case .pending:
            document.tasks[i].completed = false
            document.tasks[i].completedAt = nil
            document.tasks[i].inProgress = false
        case .doing:
            document.tasks[i].completed = false
            document.tasks[i].completedAt = nil
            document.tasks[i].inProgress = true
        case .done:
            document.tasks[i].completed = true
            document.tasks[i].completedAt = Date().timeIntervalSince1970 * 1000
            document.tasks[i].inProgress = false
        }
        commit()
    }

    func setNotes(_ text: String, for id: String) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }),
              document.tasks[i].notes != text else { return }
        document.tasks[i].notes = text
        commit()
    }

    /// Las tareas de una columna del tablero, en el mismo orden que la lista:
    /// prioridad primero y, a igual prioridad, las más viejas arriba.
    func column(_ column: TaskColumn, groupId: String? = nil,
                onlyPriority: Bool = false, now: Date = Date()) -> [TodoTask] {
        let today = HabitDay.key(now)
        return document.tasks
            .filter { task in
                guard task.column == column else { return false }
                // "Hecho" muestra sólo lo de hoy: si no, la columna crece
                // para siempre y deja de decir nada.
                if column == .done {
                    guard let at = task.completedAt else { return false }
                    return HabitDay.key(Date(timeIntervalSince1970: at / 1000)) == today
                }
                return true
            }
            .filter { groupId == nil || $0.groupId == groupId }
            .filter { !onlyPriority || $0.priority != .normal }
            .sorted {
                if column == .done { return ($0.completedAt ?? 0) > ($1.completedAt ?? 0) }
                // Si arrastraste algo en esta columna, manda tu orden. Si no,
                // la prioridad. Media columna a mano y media automática sería
                // imposible de leer, así que es todo o nada.
                if let a = $0.sort, let b = $1.sort { return a < b }
                return $0.priority.weight != $1.priority.weight
                    ? $0.priority.weight > $1.priority.weight
                    : $0.createdAt < $1.createdAt
            }
    }

    /// Mueve `id` justo antes de `target` dentro de `column`. Si `target` es
    /// nil, al final.
    ///
    /// La primera vez numera toda la columna en el orden en que la estabas
    /// viendo, para que arrastrar una tarjeta no reordene las otras siete.
    func reorder(_ id: String, before target: String?, in column: TaskColumn) {
        var visibles = self.column(column).map(\.id)
        guard let desde = visibles.firstIndex(of: id) else { return }
        visibles.remove(at: desde)

        if let target, let hasta = visibles.firstIndex(of: target) {
            visibles.insert(id, at: hasta)
        } else {
            visibles.append(id)
        }

        for (posicion, taskId) in visibles.enumerated() {
            guard let i = document.tasks.firstIndex(where: { $0.id == taskId }) else { continue }
            document.tasks[i].sort = Double(posicion)
        }
        commit()
    }

    /// Una tarjeta que llega de otra columna se coloca donde la soltaste, y si
    /// la columna ya estaba ordenada a mano se renumera con ella dentro.
    func setColumn(_ column: TaskColumn, for id: String, before target: String?) {
        setColumn(column, for: id)
        guard target != nil || self.column(column).contains(where: { $0.sort != nil }) else { return }
        reorder(id, before: target, in: column)
    }

    func updateTask(_ id: String, text: String, priority: TaskPriority,
                    deadline: String?, groupId: String?) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }) else { return }
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        document.tasks[i].text = text
        document.tasks[i].priority = priority
        document.tasks[i].deadline = deadline
        document.tasks[i].groupId = groupId
        commit()
    }

    /// Cambia un campo suelto de una tarea. Evita tener que reescribir todos
    /// los demás para tocar uno, que es como se pierden cosas.
    func modify(_ id: String, _ change: (inout TodoTask) -> Void) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }) else { return }
        change(&document.tasks[i])
        commit()
    }

    func removeTask(_ id: String) {
        document.tasks.removeAll { $0.id == id }
        commit()
    }

    func toggleSound() {
        document.soundEnabled.toggle()
        commit()
    }

    // MARK: - Grupos

    func addGroup(name: String, color: String) -> String? {
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return nil }
        let group = TaskGroup(name: name, color: color)
        document.groups.append(group)
        commit()
        return group.id
    }

    func updateGroup(_ id: String, name: String, color: String) {
        guard let i = document.groups.firstIndex(where: { $0.id == id }) else { return }
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        document.groups[i].name = name
        document.groups[i].color = color
        commit()
    }

    /// Borra las completadas. Devuelve cuántas se fueron.
    @discardableResult
    func clearCompleted() -> Int {
        let antes = document.tasks.count
        document.tasks.removeAll { $0.completed }
        let fueron = antes - document.tasks.count
        if fueron > 0 { commit() }
        return fueron
    }

    /// Al borrar un grupo, sus tareas quedan sueltas (no se borran).
    func removeGroup(_ id: String) {
        document.groups.removeAll { $0.id == id }
        var tasks = document.tasks
        for i in tasks.indices where tasks[i].groupId == id { tasks[i].groupId = nil }
        document.tasks = tasks
        commit()
    }

    // MARK: - Diario

    /// Las notas nuevas van arriba, como en la web.
    func addNote(title: String, content: String, on day: Date = Date()) {
        document.notes.insert(DiaryNote(title: title, content: content, on: day), at: 0)
        document.notes.sort { $0.createdAt > $1.createdAt }
        commit()
    }

    /// Las notas de un día, la última primero.
    func notes(on day: Date) -> [DiaryNote] {
        let key = HabitDay.key(day)
        return document.notes
            .filter { HabitDay.key($0.date) == key }
            .sorted { $0.createdAt > $1.createdAt }
    }

    /// Los días que tienen alguna nota, del más reciente al más viejo. Sirve
    /// para saltar al día anterior con algo escrito en vez de ir de a uno.
    func daysWithNotes() -> [Date] {
        var vistos = Set<String>()
        return document.notes
            .sorted { $0.createdAt > $1.createdAt }
            .compactMap { vistos.insert(HabitDay.key($0.date)).inserted ? $0.date : nil }
    }

    func updateNote(_ id: String, title: String, content: String) {
        guard let i = document.notes.firstIndex(where: { $0.id == id }) else { return }
        document.notes[i].title = title
        document.notes[i].content = content
        document.notes[i].updatedAt = Date().timeIntervalSince1970 * 1000
        commit()
    }

    func removeNote(_ id: String) {
        document.notes.removeAll { $0.id == id }
        commit()
    }
}
