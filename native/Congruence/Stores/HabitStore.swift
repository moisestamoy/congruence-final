import Foundation
import Observation

@Observable
final class HabitStore {
    private(set) var habits: [Habit] = []

    private let fileURL: URL

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? HabitStore.defaultFileURL()
        load()
    }

    // MARK: - Persistencia

    private static func defaultFileURL() -> URL {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("habits.json")
    }

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? JSONDecoder().decode([Habit].self, from: data) else {
            habits = HabitStore.seed
            return
        }
        habits = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(habits) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    // MARK: - Mutaciones

    func toggle(_ habitId: String, on day: String) {
        guard let i = habits.firstIndex(where: { $0.id == habitId }) else { return }
        if habits[i].logs[day]?.completed == true {
            habits[i].logs.removeValue(forKey: day)
        } else {
            habits[i].logs[day] = HabitLog(date: day, completed: true)
        }
        save()
    }

    func setValue(_ value: Double, for habitId: String, on day: String) {
        guard let i = habits.firstIndex(where: { $0.id == habitId }) else { return }
        if value <= 0 {
            habits[i].logs.removeValue(forKey: day)
        } else {
            habits[i].logs[day] = HabitLog(
                date: day,
                completed: value >= habits[i].goal,
                value: value
            )
        }
        save()
    }

    func markSkip(_ habitId: String, on day: String, status: LogStatus, reason: String? = nil) {
        guard let i = habits.firstIndex(where: { $0.id == habitId }) else { return }
        let trimmed = reason?.trimmingCharacters(in: .whitespacesAndNewlines)
        habits[i].logs[day] = HabitLog(
            date: day,
            completed: false,
            status: status,
            pauseReason: (trimmed?.isEmpty == false) ? trimmed : nil
        )
        save()
    }

    func add(_ habit: Habit) {
        habits.append(habit)
        save()
    }

    func remove(_ habitId: String) {
        habits.removeAll { $0.id == habitId }
        save()
    }

    // MARK: - Congruencia

    /// Porcentaje de congruencia del día. Devuelve -1 cuando el día entero está
    /// en pausa (no es 0%: es "no aplica"), igual que `getCongruence` en la web.
    func congruence(on day: String) -> Int {
        guard !habits.isEmpty else { return 0 }
        var completed = 0
        var applicable = 0
        var hasAnyLog = false

        for habit in habits {
            let log = habit.logs[day]
            if log != nil { hasAnyLog = true }
            if log?.isPaused == true { continue }
            applicable += 1
            if log?.completed == true { completed += 1 }
        }

        if !hasAnyLog { return 0 }
        if applicable == 0 { return -1 }
        return Int((Double(completed) / Double(applicable) * 100).rounded())
    }

    /// Días consecutivos con algo de congruencia, mirando hasta un año atrás.
    func streak(endingOn day: Date = HabitDay.current()) -> Int {
        var count = 0
        let today = congruence(on: HabitDay.key(day))
        if today > 0 || today == -1 { count += 1 }

        for i in 1...365 {
            let c = congruence(on: HabitDay.key(HabitDay.adding(-i, to: day)))
            if c > 0 || c == -1 { count += 1 } else { break }
        }
        return count
    }

    func level(for streak: Int) -> Int {
        switch streak {
        case 365...: return 6
        case 200...: return 5
        case 60...:  return 4
        case 30...:  return 3
        case 14...:  return 2
        default:     return 1
        }
    }

    /// Días congruentes dentro del arco de 90 días.
    func ninetyDayCongruentDays(endingOn day: Date = HabitDay.current()) -> Int {
        (0..<90).reduce(into: 0) { acc, i in
            let c = congruence(on: HabitDay.key(HabitDay.adding(-i, to: day)))
            if c > 0 || c == -1 { acc += 1 }
        }
    }

    /// Los últimos 7 días de un hábito, del más viejo al más reciente.
    func weekDots(for habit: Habit, endingOn day: Date = HabitDay.current()) -> [Bool] {
        (0..<7).reversed().map { i in
            habit.logs[HabitDay.key(HabitDay.adding(-i, to: day))]?.completed == true
        }
    }

    /// Los últimos 7 días del día completo: hubo congruencia o no.
    func congruenceWeekDots(endingOn day: Date = HabitDay.current()) -> [Bool] {
        (0..<7).reversed().map { i in
            congruence(on: HabitDay.key(HabitDay.adding(-i, to: day))) > 0
        }
    }

    // MARK: - Datos de ejemplo (sólo en el primer arranque)

    static let seed: [Habit] = [
        Habit(id: "1", title: "ENTRENAR", subtitle: "Ejemplo: hábito físico diario",
              type: .boolean, goal: 1, unit: nil, color: "#fbbf24", icon: "💪",
              identityAxis: .physical, logs: [:], isDemo: true),
        Habit(id: "2", title: "ALIMENTACIÓN IDEAL", subtitle: "Ejemplo: hábito de salud",
              type: .boolean, goal: 1, unit: nil, color: "#34d399", icon: "⭐",
              identityAxis: .physical, logs: [:], isDemo: true),
        Habit(id: "3", title: "LECTURA", subtitle: "Ejemplo: hábito de crecimiento",
              type: .numeric, goal: 30, unit: "min", color: "#60a5fa", icon: "📚",
              identityAxis: .growth, logs: [:], isDemo: true)
    ]
}
