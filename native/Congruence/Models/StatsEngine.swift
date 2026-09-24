import Foundation

/// Los números de Estadísticas, portados de `StatsPage.tsx`.
///
/// Una diferencia deliberada: la web decide si un hábito se cumplió con
/// `log.status === 'done'`, y los registros reales no tienen ese campo — sólo
/// `completed`. Allá el bloque de hábitos en detalle daría 0 % en todo. Acá
/// cumplido es `completed`, lo mismo que usa el anillo.
struct StatsEngine {
    enum Period: String, CaseIterable, Identifiable {
        case week, month, year, global
        var id: String { rawValue }
        var label: String {
            switch self {
            case .week:   return "Esta semana"
            case .month:  return "Este mes"
            case .year:   return "Este año"
            case .global: return "Global"
            }
        }
    }

    struct HabitStat: Identifiable {
        let habit: Habit
        let rate: Int
        let currentStreak: Int
        let recordStreak: Int
        /// Los últimos 14 días, del más viejo al de hoy.
        let sparkline: [Mark]
        var id: String { habit.id }
    }

    enum Mark { case done, paused, missed, empty }

    struct Point: Identifiable {
        let label: String
        let value: Int
        var id: String { label }
    }

    let habits: [Habit]
    let congruence: (String) -> Int
    let today: Date

    static let dowShort = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
    static let dowLong  = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"]

    private var calendar: Calendar {
        var c = Calendar.current
        c.firstWeekday = 2          // la semana empieza el lunes, como en la web
        return c
    }

    private func key(_ d: Date) -> String { HabitDay.key(d) }
    private func day(_ offset: Int, from d: Date) -> Date { HabitDay.adding(offset, to: d) }

    /// 0 = lunes … 6 = domingo.
    private func dowIndex(_ d: Date) -> Int {
        (calendar.component(.weekday, from: d) + 5) % 7
    }

    private func days(from start: Date, to end: Date) -> [Date] {
        var out: [Date] = []
        var d = calendar.startOfDay(for: start)
        let fin = calendar.startOfDay(for: end)
        while d <= fin { out.append(d); d = day(1, from: d) }
        return out
    }

    // MARK: - Días

    /// Desde el primer registro de cualquier hábito hasta hoy.
    var allDays: [Date] {
        let fechas = habits.flatMap { $0.logs.keys }.sorted()
        guard let primera = fechas.first, let inicio = HabitDay.formatter.date(from: primera)
        else { return [] }
        return days(from: inicio, to: today)
    }

    /// Los días ya vividos del período.
    func pastDays(_ period: Period) -> [Date] {
        switch period {
        case .week:
            let inicio = calendar.dateInterval(of: .weekOfYear, for: today)?.start ?? today
            return days(from: inicio, to: today)
        case .month:
            let inicio = calendar.dateInterval(of: .month, for: today)?.start ?? today
            return days(from: inicio, to: today)
        case .year:
            let inicio = calendar.dateInterval(of: .year, for: today)?.start ?? today
            return days(from: inicio, to: today)
        case .global:
            return allDays
        }
    }

    // MARK: - Pulso

    func average(_ dias: [Date]) -> Int {
        let vals = dias.map { congruence(key($0)) }.filter { $0 >= 0 }
        guard !vals.isEmpty, !habits.isEmpty else { return 0 }
        return Int((Double(vals.reduce(0, +)) / Double(vals.count)).rounded())
    }

    func activeDays(_ dias: [Date]) -> Int {
        dias.filter { congruence(key($0)) > 0 }.count
    }

    var streak: Int {
        var n = 0, d = today
        for _ in 0..<365 {
            guard congruence(key(d)) > 0 else { break }
            n += 1; d = day(-1, from: d)
        }
        return n
    }

    // MARK: - Hábitos en detalle

    func habitStats(_ dias: [Date]) -> [HabitStat] {
        habits.map { habit in
            let hechos = dias.filter { habit.logs[key($0)]?.completed == true }.count
            let rate = dias.isEmpty ? 0 : Int((Double(hechos) / Double(dias.count) * 100).rounded())

            var actual = 0, d = today
            for _ in 0..<365 {
                guard habit.logs[key(d)]?.completed == true else { break }
                actual += 1; d = day(-1, from: d)
            }

            var record = 0, racha = 0
            for fecha in habit.logs.keys.sorted() {
                if habit.logs[fecha]?.completed == true {
                    racha += 1; record = max(record, racha)
                } else {
                    racha = 0
                }
            }

            let sparkline: [Mark] = (0..<14).map { i in
                guard let log = habit.logs[key(day(-(13 - i), from: today))] else { return .empty }
                if log.completed { return .done }
                if log.isPaused { return .paused }
                return .missed
            }

            return HabitStat(habit: habit, rate: rate, currentStreak: actual,
                             recordStreak: record, sparkline: sparkline)
        }
        .sorted { $0.rate > $1.rate }
    }

    // MARK: - Evolución

    func chart(_ period: Period) -> [Point] {
        let dias = pastDays(period)
        switch period {
        case .week:
            return dias.map { Point(label: Self.dowShort[dowIndex($0)],
                                    value: max(0, congruence(key($0)))) }
        case .month:
            return dias.map { Point(label: DateFormatter.es("dd").string(from: $0),
                                    value: max(0, congruence(key($0)))) }
        case .year, .global:
            // De a semanas: 365 barras no se leen.
            return stride(from: 0, to: dias.count, by: 7).compactMap { i in
                let tramo = Array(dias[i..<min(i + 7, dias.count)])
                let vals = tramo.map { congruence(key($0)) }.filter { $0 >= 0 }
                guard !vals.isEmpty else { return nil }
                return Point(label: DateFormatter.es("d MMM").string(from: tramo[0]),
                             value: Int((Double(vals.reduce(0, +)) / Double(vals.count)).rounded()))
            }
        }
    }

    // MARK: - Patrones (siempre sobre todo el historial)

    /// Promedio por día de la semana; nil si hay menos de dos días con dato.
    var dayOfWeek: [(label: String, avg: Int?)] {
        var cubos = Array(repeating: [Int](), count: 7)
        for d in allDays {
            let v = congruence(key(d))
            if v >= 0 { cubos[dowIndex(d)].append(v) }
        }
        return cubos.enumerated().map { i, vals in
            (Self.dowShort[i],
             vals.count >= 2 ? Int((Double(vals.reduce(0, +)) / Double(vals.count)).rounded()) : nil)
        }
    }

    /// Las últimas cuatro semanas, de la más vieja a la actual.
    var weekTrend: [Int] {
        (0..<4).map { i -> Int in
            let ancla = day(-i * 7, from: today)
            guard let semana = calendar.dateInterval(of: .weekOfYear, for: ancla) else { return 0 }
            let fin = min(day(-1, from: semana.end), today)
            return average(days(from: semana.start, to: fin))
        }
        .reversed()
    }

    var bestWeek: (avg: Int, start: Date)? {
        let dias = allDays
        guard dias.count >= 7 else { return nil }
        var mejor: (avg: Int, start: Date)?
        for i in 0...(dias.count - 7) {
            let semana = Array(dias[i..<i + 7])
            let vals = semana.map { congruence(key($0)) }.filter { $0 >= 0 }
            guard !vals.isEmpty else { continue }
            let avg = Int((Double(vals.reduce(0, +)) / Double(vals.count)).rounded())
            if avg > (mejor?.avg ?? 0) { mejor = (avg, semana[0]) }
        }
        return mejor
    }

    struct Pauses {
        var mostPaused: (title: String, icon: String?, count: Int)?
        var topReason: (text: String, count: Int, total: Int)?
        var worstDay: (label: String, count: Int)?
    }

    var pauses: Pauses {
        var porHabito: [(title: String, icon: String?, count: Int)] = []
        var motivos: [String: Int] = [:]
        var porDia = Array(repeating: 0, count: 7)
        for habit in habits {
            var c = 0
            for (fecha, log) in habit.logs where log.isPaused {
                c += 1
                if let motivo = log.pauseReason, !motivo.isEmpty { motivos[motivo, default: 0] += 1 }
                if let d = HabitDay.formatter.date(from: fecha) { porDia[dowIndex(d)] += 1 }
            }
            if c > 0 { porHabito.append((habit.title, habit.icon, c)) }
        }
        var out = Pauses()
        out.mostPaused = porHabito.max { $0.count < $1.count }
        if let top = motivos.max(by: { $0.value < $1.value }) {
            out.topReason = (top.key, top.value, motivos.values.reduce(0, +))
        }
        if let peor = porDia.max(), peor > 0, let i = porDia.firstIndex(of: peor) {
            out.worstDay = (Self.dowLong[i], peor)
        }
        return out
    }

    /// El más sólido tiene la racha de fallos más corta; el más inestable, la
    /// más larga. Sólo cuentan los hábitos con al menos siete días de historial.
    var solidity: (solid: Habit, unstable: Habit)? {
        let lista: [(Habit, Int)] = habits.compactMap { habit in
            let fechas = habit.logs.keys.sorted()
            guard fechas.count >= 7 else { return nil }
            var peor = 0, racha = 0
            for f in fechas {
                let log = habit.logs[f]
                if log?.completed != true && log?.isPaused != true {
                    racha += 1; peor = max(peor, racha)
                } else {
                    racha = 0
                }
            }
            return (habit, peor)
        }
        let orden = lista.sorted { $0.1 < $1.1 }
        guard let primero = orden.first, let ultimo = orden.last else { return nil }
        return (primero.0, ultimo.0)
    }
}
