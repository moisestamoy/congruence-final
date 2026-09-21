import Foundation

enum DayStatus: String {
    case solid, caution, risk, critical

    var label: String {
        switch self {
        case .solid:    return "Solvente"
        case .caution:  return "Ajustado"
        case .risk:     return "Riesgo"
        case .critical: return "Déficit"
        }
    }
}

struct DayProjection: Identifiable, Hashable {
    let date: String
    let income: Double
    /// Gastos fijos del día: eventos de gasto, incluidos los recurrentes.
    let fixedExpense: Double
    /// Presupuesto diario (ajuste manual o el promedio del mes), redondeado.
    let plannedExpense: Double
    /// Gasto real registrado ese día.
    let realExpense: Double
    let totalExpense: Double
    let balance: Double
    let status: DayStatus

    var id: String { date }
}

struct MonthProjection: Identifiable {
    let year: Int
    let month: Int          // 1...12
    let days: [DayProjection]
    var id: String { String(format: "%04d-%02d", year, month) }
}

/// Port de `DailyProjectionEngine.ts` y del cálculo de `FinancesPage.tsx`.
/// Tiene que dar exactamente los mismos números que la web: el saldo inicial
/// que cargaste se calibró con esa cuenta, así que cualquier diferencia se
/// vería como plata que aparece o desaparece.
enum FinanceEngine {
    static var calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = .current
        return c
    }()

    static func key(_ y: Int, _ m: Int, _ d: Int) -> String {
        String(format: "%04d-%02d-%02d", y, m, d)
    }

    static func daysIn(_ y: Int, _ m: Int) -> Int {
        let date = calendar.date(from: DateComponents(year: y, month: m, day: 1))!
        return calendar.range(of: .day, in: .month, for: date)!.count
    }

    /// `Math.round` de JavaScript: los .5 van hacia arriba.
    static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

    // MARK: - Un mes

    static func month(year: Int, month: Int, doc: FinancesDocument,
                      events: [FinancialEvent], overrides: [DailyOverride],
                      realExpenses: [DailyRealExpense], startBalance: Double) -> MonthProjection {
        let daysInMonth = daysIn(year, month)
        let targetYM = String(format: "%04d-%02d", year, month)
        let config = doc.config

        // El presupuesto vigente: el cambio más reciente que no sea posterior al mes.
        var activeBudget = config.monthlyFixedBudget
        if let change = config.budgetChanges
            .sorted(by: { $0.key > $1.key })
            .first(where: { $0.key <= targetYM }) {
            activeBudget = change.value
        }
        let dailyBase = (activeBudget / Double(daysInMonth)).rounded(.up)

        var realByDate: [String: Double] = [:]
        for e in realExpenses { realByDate[e.date, default: 0] += e.amount }

        // Si hay dos ajustes para el mismo día gana el último, como en el `reduce` de la web.
        var overrideByDate: [String: Double?] = [:]
        for o in overrides { overrideByDate[o.date] = o.budget }

        var balance = startBalance
        var days: [DayProjection] = []

        for day in 1...daysInMonth {
            let dateStr = key(year, month, day)
            let dayEvents = events.filter { occurs($0, on: day, yearMonth: targetYM,
                                                   daysInMonth: daysInMonth, dateStr: dateStr) }
            let income = dayEvents.filter { $0.type == .income }.reduce(0) { $0 + $1.amount }
            let fixed = dayEvents.filter { $0.type == .expense }.reduce(0) { $0 + $1.amount }

            let planned = (overrideByDate[dateStr] ?? nil) ?? dailyBase
            let real = realByDate[dateStr] ?? 0
            let variable = real > 0 ? real : planned
            let outgoing = fixed + variable
            balance = balance + income - outgoing

            let status: DayStatus
            if balance < 0 { status = .critical }
            else if balance < 200 { status = .risk }
            else if balance < 1000 { status = .caution }
            else { status = .solid }

            days.append(DayProjection(
                date: dateStr, income: income, fixedExpense: fixed,
                plannedExpense: jsRound(planned), realExpense: real,
                totalExpense: outgoing, balance: balance, status: status
            ))
        }
        return MonthProjection(year: year, month: month, days: days)
    }

    /// Un evento recurrente cae el mismo número de día todos los meses desde que
    /// se creó; si ese día no existe (un 31 en febrero), cae el último día.
    static func occurs(_ e: FinancialEvent, on day: Int, yearMonth: String,
                       daysInMonth: Int, dateStr: String) -> Bool {
        guard e.isRecurring else { return e.date == dateStr }
        let parts = e.date.split(separator: "-")
        guard parts.count == 3, let eDay = Int(parts[2]) else { return false }
        if yearMonth < "\(parts[0])-\(parts[1])" { return false }
        return min(eDay, daysInMonth) == day
    }

    /// Los eventos de una fecha, contando los recurrentes (`eventsOnDate` en la web).
    static func events(_ events: [FinancialEvent], on dateStr: String) -> [FinancialEvent] {
        let p = dateStr.split(separator: "-")
        guard p.count == 3, let y = Int(p[0]), let m = Int(p[1]), let d = Int(p[2]) else { return [] }
        let ym = "\(p[0])-\(p[1])"
        return events.filter { occurs($0, on: d, yearMonth: ym, daysInMonth: daysIn(y, m), dateStr: dateStr) }
    }

    // MARK: - El recorrido completo

    /// Mes desde el que se acumula el saldo.
    ///
    /// Replica a propósito un detalle de la web: hace `new Date("2026-06-01")`,
    /// que JavaScript interpreta como medianoche UTC. En zonas al oeste de
    /// Greenwich (Bogotá, UTC-5) eso es el 31 de mayo a la noche, así que el
    /// recorrido empieza un mes antes. El saldo inicial que tenés cargado se
    /// calibró con ese recorrido; si la nativa lo "corrigiera" sola, todos los
    /// saldos se correrían. Arreglarlo tiene que ser en las dos apps a la vez.
    static func walkStart(for doc: FinancesDocument, today: Date = Date()) -> (year: Int, month: Int) {
        let ym: String
        if let start = doc.config.cycleStartYearMonth, !start.isEmpty {
            ym = start
        } else {
            let dates = (doc.events.map(\.date) + doc.realExpenses.map(\.date)).sorted()
            guard let first = dates.first, first.count >= 7 else {
                let c = calendar.dateComponents([.year, .month], from: today)
                return (c.year!, c.month!)
            }
            ym = String(first.prefix(7))
        }
        let parts = ym.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 2 else {
            let c = calendar.dateComponents([.year, .month], from: today)
            return (c.year!, c.month!)
        }
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC")!
        let instant = utc.date(from: DateComponents(year: parts[0], month: parts[1], day: 1))!
        let local = calendar.dateComponents([.year, .month], from: instant)
        return (local.year!, local.month!)
    }

    /// Los meses visibles, desde `fromYear/fromMonth`, con el saldo encadenado
    /// desde el inicio del ciclo — igual que `projections` en FinancesPage.tsx.
    static func months(from fromYear: Int, _ fromMonth: Int, horizon: Int,
                       doc: FinancesDocument, today: Date = Date()) -> [MonthProjection] {
        let events = doc.events
        let overrides = doc.overrides
        let real = doc.realExpenses

        var (y, m) = walkStart(for: doc, today: today)
        var balance = doc.config.initialBalance
        while (y, m) < (fromYear, fromMonth) {
            let p = month(year: y, month: m, doc: doc, events: events, overrides: overrides,
                          realExpenses: real, startBalance: balance)
            if let last = p.days.last { balance = last.balance }
            (y, m) = next(y, m)
        }

        var out: [MonthProjection] = []
        (y, m) = (fromYear, fromMonth)
        for _ in 0..<horizon {
            let p = month(year: y, month: m, doc: doc, events: events, overrides: overrides,
                          realExpenses: real, startBalance: balance)
            out.append(p)
            balance = p.days.last?.balance ?? balance
            (y, m) = next(y, m)
        }
        return out
    }

    static func next(_ y: Int, _ m: Int) -> (Int, Int) { m == 12 ? (y + 1, 1) : (y, m + 1) }
    static func previous(_ y: Int, _ m: Int) -> (Int, Int) { m == 1 ? (y - 1, 12) : (y, m - 1) }

    /// La proyección de hoy, sea cual sea el mes que estés mirando.
    static func today(doc: FinancesDocument, now: Date = Date()) -> DayProjection? {
        let c = calendar.dateComponents([.year, .month, .day], from: now)
        let m = months(from: c.year!, c.month!, horizon: 1, doc: doc, today: now)
        return m.first?.days.first { $0.date == key(c.year!, c.month!, c.day!) }
    }

    // MARK: - Totales del mes (tarjetas y categorías)

    struct MonthStats {
        var income: Double = 0
        var expenses: Double = 0
        var categories: [(name: String, value: Double)] = []
        var net: Double { income - expenses }
    }

    static func stats(for month: MonthProjection, doc: FinancesDocument) -> MonthStats {
        let events = doc.events
        let real = doc.realExpenses
        var s = MonthStats()
        var byCategory: [String: Double] = [:]

        for day in month.days {
            let dayEvents = Self.events(events, on: day.date)
            for e in dayEvents where e.type == .income { s.income += e.amount }
            for e in dayEvents where e.type == .expense {
                s.expenses += e.amount
                byCategory[e.category.isEmpty ? "Fijos" : e.category, default: 0] += e.amount
            }
            if day.realExpense > 0 {
                for e in real where e.date == day.date {
                    s.expenses += e.amount
                    byCategory[e.category.isEmpty ? "Variables" : e.category, default: 0] += e.amount
                }
            } else {
                s.expenses += day.plannedExpense
                byCategory["Ajuste diario", default: 0] += day.plannedExpense
            }
        }
        s.categories = byCategory.map { ($0.key, $0.value) }.sorted { $0.value > $1.value }
        return s
    }
}

// MARK: - Moneda (fmtCur en la web)

enum Money {
    static func symbol(for currency: String?) -> String {
        switch currency {
        case "USD", "MXN", "COP": return "$"
        case "GBP": return "£"
        case "BRL": return "R$"
        default: return "€"
        }
    }

    /// Sin decimales si el monto es redondo, con dos si tiene céntimos.
    static func format(_ n: Double, doc: FinancesDocument) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: doc.config.currencyLocale ?? "de-DE")
        let abs = Swift.abs(n)
        let hasCents = abs.truncatingRemainder(dividingBy: 1) != 0
        f.minimumFractionDigits = hasCents ? 2 : 0
        f.maximumFractionDigits = 2
        return symbol(for: doc.config.currency) + (f.string(from: NSNumber(value: abs)) ?? "\(abs)")
    }
}
