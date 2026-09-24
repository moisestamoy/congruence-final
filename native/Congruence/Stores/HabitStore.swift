import Foundation
import Observation

@Observable
final class HabitStore {
    /// Todo lo que vive en `habits_data`: hábitos, manifiesto y lo que la web
    /// agregue. Se guarda y se sube entero, sin perder campos.
    private(set) var document: HabitsDocument

    var habits: [Habit] { document.habits }

    var manifesto: IdentityManifesto {
        get { document.identity }
        set { document.identity = newValue; commit() }
    }

    /// Se llama después de cada cambio hecho acá (no de los que llegan de la
    /// nube). La sincronización se engancha acá para subir.
    @ObservationIgnored var onLocalChange: (() -> Void)?

    private let fileURL: URL

    /// Cuándo se escribió este documento en el disco por última vez. Es lo que
    /// el primer login compara contra la nube para decidir quién manda.
    var lastLocalWrite: Date? {
        (try? FileManager.default.attributesOfItem(atPath: fileURL.path))?[.modificationDate] as? Date
    }

    /// Copia el archivo tal como está a `carpeta`. Se usa antes de entrar con
    /// la cuenta: si la nube va a ganar, lo local no se pierde.
    func backupFile(to carpeta: URL) {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        try? FileManager.default.copyItem(
            at: fileURL, to: carpeta.appendingPathComponent(fileURL.lastPathComponent))
    }

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? HabitStore.defaultFileURL()
        self.document = HabitStore.load(from: self.fileURL)
    }

    // MARK: - Persistencia local

    private static func defaultFileURL() -> URL {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("habits.json")
    }

    private static func load(from url: URL) -> HabitsDocument {
        guard let data = try? Data(contentsOf: url) else {
            return HabitsDocument(habits: seed)
        }
        if let doc = try? JSONDecoder().decode(HabitsDocument.self, from: data) {
            return doc
        }
        // Formato anterior: sólo el arreglo de hábitos.
        if let habits = try? JSONDecoder().decode([Habit].self, from: data) {
            return HabitsDocument(habits: habits)
        }
        return HabitsDocument(habits: seed)
    }

    private func writeToDisk() {
        guard let data = try? JSONEncoder().encode(document) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    /// Cambio local: se guarda y se avisa para subirlo.
    private func commit() {
        writeToDisk()
        onLocalChange?()
    }

    /// Versión que llega de la nube: reemplaza todo, se guarda, y NO avisa —
    /// si avisara, volvería a subir lo mismo que acaba de bajar.
    func adoptRemote(_ remote: HabitsDocument) {
        document = remote
        writeToDisk()
    }

    // MARK: - Mutaciones

    private func index(of id: String) -> Int? {
        document.habits.firstIndex { $0.id == id }
    }

    func toggle(_ habitId: String, on day: String) {
        guard let i = index(of: habitId) else { return }
        if document.habits[i].logs[day]?.completed == true {
            document.habits[i].logs.removeValue(forKey: day)
        } else {
            document.habits[i].logs[day] = HabitLog(date: day, completed: true)
        }
        commit()
    }

    func setValue(_ value: Double, for habitId: String, on day: String) {
        guard let i = index(of: habitId) else { return }
        if value <= 0 {
            document.habits[i].logs.removeValue(forKey: day)
        } else {
            document.habits[i].logs[day] = HabitLog(
                date: day,
                completed: value >= document.habits[i].goal,
                value: value
            )
        }
        commit()
    }

    func markSkip(_ habitId: String, on day: String, status: LogStatus, reason: String? = nil) {
        guard let i = index(of: habitId) else { return }
        let trimmed = reason?.trimmingCharacters(in: .whitespacesAndNewlines)
        document.habits[i].logs[day] = HabitLog(
            date: day,
            completed: false,
            status: status,
            pauseReason: (trimmed?.isEmpty == false) ? trimmed : nil
        )
        commit()
    }

    func add(_ habit: Habit) {
        document.habits.append(habit)
        commit()
    }

    func remove(_ habitId: String) {
        document.habits.removeAll { $0.id == habitId }
        commit()
    }

    /// Cambia nombre, ícono, color, eje o tipo. El historial y los campos que
    /// la nativa no conoce no se tocan: editar nunca borra nada.
    func update(_ edited: Habit) {
        guard let i = index(of: edited.id) else { return }
        var merged = edited
        merged.logs = document.habits[i].logs
        merged.extras = document.habits[i].extras
        // Los extras guardados mandan para no perder nada de la web, pero la
        // frecuencia sí la edita esta hoja, así que esa pasa por encima.
        merged.weeklyTarget = edited.weeklyTarget
        merged.archived = document.habits[i].archived
        merged.isDemo = false
        document.habits[i] = merged
        commit()
    }

    /// Mueve un hábito una posición arriba (-1) o abajo (+1).
    func move(_ habitId: String, by offset: Int) {
        guard let i = index(of: habitId) else { return }
        let j = i + offset
        guard document.habits.indices.contains(j) else { return }
        document.habits.swapAt(i, j)
        commit()
    }

    /// Suelta un hábito arrastrado en el lugar de otro.
    func move(_ habitId: String, onto targetId: String) {
        guard habitId != targetId,
              let from = index(of: habitId),
              let to = index(of: targetId) else { return }
        let habit = document.habits.remove(at: from)
        document.habits.insert(habit, at: to)
        commit()
    }

    // MARK: - Congruencia

    /// Porcentaje de congruencia del día. Devuelve -1 cuando el día entero está
    /// en pausa (no es 0%: es "no aplica"), igual que `getCongruence` en la web.
    func congruence(on day: String) -> Int {
        guard !habits.isEmpty else { return 0 }
        var completed = 0
        var applicable = 0
        var hasAnyLog = false

        let date = HabitDay.formatter.date(from: day) ?? Date()
        for habit in habits {
            let log = habit.logs[day]
            if log != nil { hasAnyLog = true }
            if log?.isPaused == true { continue }
            // Un hábito semanal que ya llegó a su mínimo sale del cálculo:
            // no se cumplió hoy, pero tampoco se está faltando a nada. Si
            // contara como pendiente, cumplir el objetivo bajaría el anillo.
            if habit.weeklyTarget != nil, log?.completed != true,
               weeklyMet(habit, on: date) { continue }
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

    // MARK: - Hábitos con mínimo semanal

    /// El lunes de la semana de `day`, con el mismo corte de las 5 de la
    /// mañana que usa el resto de la app.
    static func weekStart(of day: Date) -> Date {
        // En Foundation el domingo es 1 y el lunes 2; queremos que la semana
        // empiece el lunes, así que corremos hacia atrás lo que haga falta.
        let weekday = Calendar.current.component(.weekday, from: day)
        return HabitDay.adding(-((weekday + 5) % 7), to: day)
    }

    /// Veces que se cumplió el hábito en la semana de `day`.
    func weekCount(for habit: Habit, on day: Date = HabitDay.current()) -> Int {
        let monday = Self.weekStart(of: day)
        return (0..<7).reduce(into: 0) { acc, i in
            let key = HabitDay.key(HabitDay.adding(i, to: monday))
            if habit.logs[key]?.completed == true { acc += 1 }
        }
    }

    /// El mínimo de la semana ya está cubierto. A partir de acá el hábito deja
    /// de pedirse: ni cuenta como pendiente ni como cumplido del día.
    func weeklyMet(_ habit: Habit, on day: Date = HabitDay.current()) -> Bool {
        guard let target = habit.weeklyTarget else { return false }
        return weekCount(for: habit, on: day) >= target
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

    // MARK: - Datos de ejemplo (sólo en el primer arranque, sin cuenta)

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
