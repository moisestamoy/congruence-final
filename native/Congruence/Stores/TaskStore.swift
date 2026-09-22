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

    func addTask(text: String, priority: TaskPriority, deadline: String?, groupId: String?) {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        document.tasks.append(TodoTask(text: text, priority: priority,
                                       deadline: deadline, groupId: groupId))
        commit()
    }

    func toggleTask(_ id: String) {
        guard let i = document.tasks.firstIndex(where: { $0.id == id }) else { return }
        let nowDone = !document.tasks[i].completed
        document.tasks[i].completed = nowDone
        document.tasks[i].completedAt = nowDone ? Date().timeIntervalSince1970 * 1000 : nil
        commit()
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
    func addNote(title: String, content: String) {
        document.notes.insert(DiaryNote(title: title, content: content), at: 0)
        commit()
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
