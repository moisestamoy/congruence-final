import Charts
import SwiftUI

// Lo que la web tenía en Finanzas y la nativa todavía no: metas de ahorro,
// presupuestos por categoría, flujo del mes, el año entero y alertas.

// MARK: - Metas de ahorro (SavingsGoalsModal)

struct SavingsGoalsSheet: View {
    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var amount = ""
    @State private var note = ""
    @State private var editing: FinanceStore.GoalKind?
    @State private var goalDraft = ""

    private var doc: FinancesDocument { store.document }
    private func money(_ n: Double) -> String { Money.format(n, doc: doc) }

    private var cal: Calendar { FinanceEngine.calendar }

    /// El patrimonio del año: el saldo de hoy más lo aportado este año. Igual
    /// que la web, el saldo cuenta como parte de lo construido.
    private var annualSaved: Double {
        let saldo = doc.config.actualBalanceDisplay ?? doc.config.initialBalance
        let año = cal.component(.year, from: Date())
        return saldo + doc.savingsEntries
            .filter { $0.parsedDate.map { cal.component(.year, from: $0) } == año }
            .reduce(0) { $0 + $1.amount }
    }

    private var monthlySaved: Double {
        doc.savingsEntries
            .filter { $0.parsedDate.map { cal.isDate($0, equalTo: Date(), toGranularity: .month) } == true }
            .reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Metas de ahorro").font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Palette.text)
                    Text("Construye tu patrimonio").font(.system(size: 12))
                        .foregroundStyle(Palette.textFaint)
                }
                Spacer()
                Button("Cerrar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
            }

            HStack(spacing: 14) {
                goalRing(.annual, "Meta anual", saved: annualSaved, goal: doc.annualGoal,
                         sub: "patrimonio este año")
                goalRing(.monthly, "Meta mensual", saved: monthlySaved, goal: doc.monthlyGoal,
                         sub: "aportado este mes")
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Registrar aporte").microLabelStyle(Palette.textFaint, size: 9)
                HStack(spacing: 10) {
                    DarkField(placeholder: "Monto", text: $amount, width: 130)
                    DarkField(placeholder: "Nota (opcional)", text: $note)
                    Button("Guardar") { add() }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(parsedAmount != nil ? Palette.onAccent : Palette.textFaint)
                        .padding(.horizontal, 18)
                        .frame(height: 38)
                        .background(Capsule().fill(parsedAmount != nil ? FinPalette.income : Palette.fill(0.06)))
                        .disabled(parsedAmount == nil)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Historial").microLabelStyle(Palette.textFaint, size: 9)
                if doc.savingsEntries.isEmpty {
                    Text("Todavía no registraste aportes.")
                        .font(.system(size: 12, design: .serif)).italic()
                        .foregroundStyle(Palette.textFaint)
                        .padding(.vertical, 8)
                } else {
                    ScrollView {
                        VStack(spacing: 2) {
                            ForEach(doc.savingsEntries) { entry in
                                entryRow(entry)
                            }
                        }
                    }
                    .frame(maxHeight: 200)
                }
            }
        }
        .padding(26)
        .sheetWidth(560)
        .background(Palette.surface)
    }

    private var parsedAmount: Double? {
        let v = Double(amount.replacingOccurrences(of: ",", with: "."))
        return (v ?? 0) > 0 ? v : nil
    }

    private func add() {
        guard let v = parsedAmount else { return }
        store.addSavingsEntry(amount: v, note: note)
        SoundEffects.shared.play(.bell, enabled: true)
        amount = ""
        note = ""
    }

    private func goalRing(_ kind: FinanceStore.GoalKind, _ label: String,
                          saved: Double, goal: Double, sub: String) -> some View {
        let progress = goal > 0 ? min(max(saved / goal, 0), 1) : 0
        return VStack(spacing: 10) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            ZStack {
                GoalRing(progress: progress)
                VStack(spacing: 2) {
                    Text("\(Int((progress * 100).rounded()))%")
                        .font(.system(size: 22, weight: .black)).monospacedDigit()
                        .foregroundStyle(Palette.text)
                    Text(Money.signed(saved, doc: doc)).font(.system(size: 10)).monospacedDigit()
                        .foregroundStyle(Palette.textFaint)
                }
            }
            .frame(width: 118, height: 118)

            if editing == kind {
                HStack(spacing: 6) {
                    DarkField(placeholder: "Meta", text: $goalDraft, width: 110)
                    Button("OK") {
                        if let v = Double(goalDraft.replacingOccurrences(of: ",", with: ".")), v >= 0 {
                            store.setSavingsGoal(kind, v)
                        }
                        editing = nil
                    }
                    .buttonStyle(.plain)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accent)
                }
            } else {
                Button {
                    goalDraft = goal > 0 ? String(Int(goal)) : ""
                    editing = kind
                } label: {
                    Text(goal > 0 ? "de \(money(goal)) · editar" : "Poner meta")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textMuted)
                        .underline(goal <= 0)
                }
                .buttonStyle(.plain)
            }
            Text(sub).font(.system(size: 10)).foregroundStyle(Palette.textFaint)
        }
        .padding(18)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.fill(0.04)))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineFaint, lineWidth: 1))
    }

    private func entryRow(_ entry: SavingsEntry) -> some View {
        HStack(spacing: 10) {
            Text(entry.parsedDate.map { DateFormatter.es("d MMM yyyy").string(from: $0) } ?? "")
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(Palette.textFaint)
                .frame(width: 88, alignment: .leading)
            Text(entry.note.isEmpty ? "Aporte" : entry.note)
                .font(.system(size: 12))
                .foregroundStyle(Palette.textMuted)
                .lineLimit(1)
            Spacer()
            Text("+\(money(entry.amount))")
                .font(.system(size: 12, weight: .semibold)).monospacedDigit()
                .foregroundStyle(FinPalette.income)
            Button { store.deleteSavingsEntry(entry.id) } label: {
                Image(systemName: "trash")
                    .font(.system(size: 10))
                    .foregroundStyle(Palette.textFaint)
                    .frame(width: 20, height: 20)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("Borrar aporte")
        }
        .padding(.vertical, 6)
    }
}

// MARK: - Presupuestos por categoría (CategoryBudgetsPanel)

struct CategoryBudgetsPanel: View {
    let stats: FinanceEngine.MonthStats
    let doc: FinancesDocument

    @Environment(FinanceStore.self) private var store
    @State private var editing: String?
    @State private var draft = ""

    private func money(_ n: Double) -> String { Money.format(n, doc: doc) }

    /// Las que tienen gasto este mes o un límite puesto, las de más gasto arriba.
    private var rows: [(name: String, spent: Double, limit: Double)] {
        let gastado = Dictionary(stats.categories.map { ($0.name, $0.value) },
                                 uniquingKeysWith: +)
        let limites = doc.categoryBudgets
        let nombres = Set(gastado.filter { $0.value > 0 }.keys)
            .union(limites.filter { $0.value > 0 }.keys)
        return nombres
            .map { ($0, gastado[$0] ?? 0, limites[$0] ?? 0) }
            .sorted { $0.spent > $1.spent }
    }

    var body: some View {
        let lista = rows
        let total = lista.reduce(0) { $0 + $1.spent }
        let tope = lista.reduce(0) { $0 + $1.limit }

        FinCard {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Text("Presupuesto por categoría").microLabelStyle(Palette.textFaint, size: 9)
                    Spacer()
                    if tope > 0 {
                        Text("\(money(total)) / \(money(tope))")
                            .font(.system(size: 10, weight: .semibold)).monospacedDigit()
                            .foregroundStyle(total > tope ? FinPalette.expense : Palette.textMuted)
                    }
                }

                if lista.isEmpty {
                    Text("Registra gastos con categoría para ver el desglose.")
                        .font(.system(size: 12, design: .serif)).italic()
                        .foregroundStyle(Palette.textFaint)
                } else {
                    ForEach(lista, id: \.name) { fila in
                        row(fila.name, spent: fila.spent, limit: fila.limit)
                    }
                }
            }
        }
    }

    private func row(_ name: String, spent: Double, limit: Double) -> some View {
        let pct = limit > 0 ? spent / limit : 0
        let color = pct > 1 ? FinPalette.expense : pct >= 0.8 ? Palette.warning : FinPalette.income
        return VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(name).font(.system(size: 12)).foregroundStyle(Palette.text).lineLimit(1)
                Spacer()
                Text(money(spent)).font(.system(size: 12, weight: .semibold)).monospacedDigit()
                    .foregroundStyle(Palette.text)
                if editing == name {
                    DarkField(placeholder: "Límite", text: $draft, width: 90)
                        .onSubmit { commit(name) }
                    Button("OK") { commit(name) }
                        .buttonStyle(.plain)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.accent)
                } else {
                    Button {
                        draft = limit > 0 ? String(Int(limit)) : ""
                        editing = name
                    } label: {
                        Text(limit > 0 ? "/ \(money(limit))" : "+ límite")
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.textFaint)
                    }
                    .buttonStyle(.plain)
                    .help("Poner un límite mensual a esta categoría")
                }
            }
            if limit > 0 {
                ProgressLine(value: min(pct, 1), color: color)
                if spent > limit {
                    Text("Excedido por \(money(spent - limit))")
                        .font(.system(size: 10)).foregroundStyle(FinPalette.expense)
                }
            }
        }
    }

    private func commit(_ name: String) {
        if let v = Double(draft.replacingOccurrences(of: ",", with: ".")), v >= 0 {
            store.setCategoryBudget(name, v)
        }
        editing = nil
    }
}

// MARK: - Flujo del mes (CashFlowChart)

/// El saldo día a día del mes que estás mirando. Verde por encima de cero,
/// rojo por debajo: el día en que cruza la línea es el que importa.
struct CashFlowCard: View {
    let month: MonthProjection
    let doc: FinancesDocument

    /// Cuánto de la línea está dibujado, de 0 a 1.
    @State private var reveal: CGFloat = 0
    /// El punto donde cruza a cero late una vez al terminar de dibujarse.
    @State private var pulse = false

    var body: some View {
        let puntos = month.days.map { (day: Int($0.date.suffix(2)) ?? 0, balance: $0.balance) }
        let minimo = puntos.map(\.balance).min() ?? 0
        let maximo = puntos.map(\.balance).max() ?? 0

        FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Flujo de caja · \(FinDate.monthTitle(month.year, month.month))")
                        .microLabelStyle(Palette.textFaint, size: 9)
                    Spacer()
                    if let cruce = month.days.first(where: { $0.balance < 0 }) {
                        Text("Cruza a negativo el \(DateFormatter.es("d 'de' MMMM").string(from: FinDate.date(cruce.date)))")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(FinPalette.expense)
                    }
                }
                Chart(puntos, id: \.day) { p in
                    AreaMark(x: .value("Día", p.day), y: .value("Saldo", p.balance))
                        .foregroundStyle(p.balance >= 0 ? FinPalette.income.opacity(0.18)
                                                        : FinPalette.expense.opacity(0.18))
                    LineMark(x: .value("Día", p.day), y: .value("Saldo", p.balance))
                        .foregroundStyle(maximo <= 0 ? FinPalette.expense
                                         : minimo >= 0 ? FinPalette.income : Palette.textMuted)
                        .lineStyle(StrokeStyle(lineWidth: 2))
                    RuleMark(y: .value("Cero", 0))
                        .foregroundStyle(Palette.hairline)
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    if let cruce = crossing, cruce.day == p.day {
                        PointMark(x: .value("Día", cruce.day), y: .value("Saldo", cruce.balance))
                            .symbolSize(pulse ? 220 : 50)
                            .foregroundStyle(FinPalette.expense.opacity(pulse ? 0.55 : 1))
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: 5)) { _ in
                        AxisValueLabel().font(.system(size: 9))
                    }
                }
                // La línea se dibuja de izquierda a derecha: el mes se lee
                // como lo que es, algo que pasa en orden.
                .chartPlotStyle { plot in
                    plot.mask(alignment: .leading) {
                        GeometryReader { g in
                            Rectangle().frame(width: g.size.width * reveal)
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks { v in
                        AxisGridLine().foregroundStyle(Palette.hairlineFaint)
                        AxisValueLabel {
                            Text(Money.signed(v.as(Double.self) ?? 0, doc: doc)).font(.system(size: 9))
                        }
                    }
                }
                .frame(height: 170)
            }
        }
        .onAppear(perform: draw)
        .onChange(of: month.id) { _, _ in draw() }
    }

    private var crossing: (day: Int, balance: Double)? {
        month.days.first { $0.balance < 0 }
            .map { (Int($0.date.suffix(2)) ?? 0, $0.balance) }
    }

    private func draw() {
        reveal = 0
        pulse = false
        withAnimation(.easeOut(duration: 1.1)) { reveal = 1 }
        guard crossing != nil else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.1) {
            withAnimation(.easeOut(duration: 0.35)) { pulse = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                withAnimation(.easeIn(duration: 0.4)) { pulse = false }
            }
        }
    }
}

// MARK: - El año (AnnualChart)

/// Los doce meses del año: lo que entra, lo que sale y cómo cierra el saldo.
///
/// Antes del inicio del ciclo no hay nada, y así se muestra. La web, si el
/// ciclo empieza después de enero, arranca igual en enero y cobra el
/// presupuesto de todos los meses previos: con un ciclo de septiembre, eso son
/// ocho meses fantasma.
struct AnnualCard: View {
    let doc: FinancesDocument

    struct Mes: Identifiable {
        let month: Int
        let income: Double
        let expense: Double
        let balance: Double?
        var id: Int { month }
    }

    private static let abreviaturas = ["ene", "feb", "mar", "abr", "may", "jun",
                                       "jul", "ago", "sep", "oct", "nov", "dic"]

    private var meses: [Mes] {
        let año = FinanceEngine.calendar.component(.year, from: Date())
        let inicio = FinanceEngine.walkStart(for: doc)
        // El primer mes que se proyecta es el del ciclo si cae este año; si el
        // ciclo empezó antes, enero (el recorrido trae el saldo de arrastre).
        let desde = inicio.year < año ? 1 : (inicio.year == año ? inicio.month : 13)
        var datos: [Int: (Double, Double, Double)] = [:]
        if desde <= 12 {
            for p in FinanceEngine.months(from: año, desde, horizon: 13 - desde, doc: doc) {
                let s = FinanceEngine.stats(for: p, doc: doc)
                datos[p.month] = (s.income, s.expenses, p.days.last?.balance ?? 0)
            }
        }
        return (1...12).map { m in
            if let d = datos[m] { return Mes(month: m, income: d.0, expense: d.1, balance: d.2) }
            return Mes(month: m, income: 0, expense: 0, balance: nil)
        }
    }

    var body: some View {
        let datos = meses
        let mesActual = FinanceEngine.calendar.component(.month, from: Date())

        FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 14) {
                    Text("El año").microLabelStyle(Palette.textFaint, size: 9)
                    Spacer()
                    leyenda("Entra", FinPalette.income)
                    leyenda("Sale", FinPalette.expense)
                    leyenda("Saldo al cierre", FinPalette.daily)
                }
                Chart {
                    ForEach(datos) { m in
                        BarMark(x: .value("Mes", Self.abreviaturas[m.month - 1]),
                                y: .value("Monto", m.income))
                            .foregroundStyle(FinPalette.income.opacity(m.month == mesActual ? 0.9 : 0.5))
                            .position(by: .value("Tipo", "Entra"))
                        BarMark(x: .value("Mes", Self.abreviaturas[m.month - 1]),
                                y: .value("Monto", -m.expense))
                            .foregroundStyle(FinPalette.expense.opacity(m.month == mesActual ? 0.9 : 0.5))
                            .position(by: .value("Tipo", "Sale"))
                    }
                    ForEach(datos.filter { $0.balance != nil }) { m in
                        LineMark(x: .value("Mes", Self.abreviaturas[m.month - 1]),
                                 y: .value("Saldo", m.balance ?? 0))
                            .foregroundStyle(FinPalette.daily)
                            .lineStyle(StrokeStyle(lineWidth: 2))
                            .symbol(.circle)
                            .symbolSize(18)
                    }
                    RuleMark(y: .value("Cero", 0))
                        .foregroundStyle(Palette.hairline)
                }
                .chartYAxis {
                    AxisMarks { v in
                        AxisGridLine().foregroundStyle(Palette.hairlineFaint)
                        AxisValueLabel {
                            Text(Money.signed(v.as(Double.self) ?? 0, doc: doc)).font(.system(size: 9))
                        }
                    }
                }
                .frame(height: 210)

                if datos.allSatisfy({ $0.balance == nil }) {
                    Text("El ciclo empieza más adelante.")
                        .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                }
            }
        }
    }

    private func leyenda(_ texto: String, _ color: Color) -> some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(texto).font(.system(size: 10)).foregroundStyle(Palette.textMuted)
        }
    }
}

// MARK: - Alertas (AlertsModal)

enum FinanceAlerts {
    /// Un tramo de días seguidos en el mismo estado. Sesenta días en rojo
    /// son un solo problema, no sesenta avisos.
    struct Alert: Identifiable {
        let start: String
        var end: String
        let critical: Bool
        var days: Int
        /// El saldo más bajo del tramo.
        var worst: Double
        var id: String { start }
    }

    static func scan(_ months: [MonthProjection]) -> [Alert] {
        var out: [Alert] = []
        for d in months.flatMap(\.days) {
            let critical: Bool
            switch d.status {
            case .critical: critical = true
            case .risk:     critical = false
            default:        continue
            }
            if var ultimo = out.last, ultimo.critical == critical,
               Calendar.current.dateComponents([.day], from: FinDate.date(ultimo.end),
                                               to: FinDate.date(d.date)).day == 1 {
                ultimo.end = d.date
                ultimo.days += 1
                ultimo.worst = min(ultimo.worst, d.balance)
                out[out.count - 1] = ultimo
            } else {
                out.append(Alert(start: d.date, end: d.date, critical: critical, days: 1, worst: d.balance))
            }
        }
        return out
    }
}

struct AlertsSheet: View {
    let alerts: [FinanceAlerts.Alert]
    let doc: FinancesDocument

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Alertas").font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.text)
                Spacer()
                Button("Cerrar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
            }

            if alerts.isEmpty {
                Text("Nada que avisar en los meses que estás viendo.")
                    .font(.system(size: 13, design: .serif)).italic()
                    .foregroundStyle(Palette.textFaint)
                    .padding(.vertical, 20)
            } else {
                // El primer día de cada tipo es el que importa: después sigue
                // igual. Los demás van debajo, agrupados.
                if let primero = alerts.first(where: \.critical) {
                    Text("El saldo cruza a negativo el \(fecha(primero.start)).")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(FinPalette.expense)
                }
                ScrollView {
                    VStack(spacing: 2) {
                        ForEach(alerts) { a in
                            HStack(spacing: 10) {
                                Image(systemName: a.critical ? "exclamationmark.circle.fill"
                                                             : "exclamationmark.triangle.fill")
                                    .font(.system(size: 11))
                                    .foregroundStyle(a.critical ? FinPalette.expense : Palette.warning)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(a.critical ? "Déficit proyectado" : "Saldo bajo")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.text)
                                    Text(a.days == 1 ? fecha(a.start)
                                         : "\(fecha(a.start)) – \(fecha(a.end)) · \(a.days) días")
                                        .font(.system(size: 11))
                                        .foregroundStyle(Palette.textMuted)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(Money.signed(a.worst, doc: doc))
                                        .font(.system(size: 12, weight: .semibold)).monospacedDigit()
                                        .foregroundStyle(a.critical ? FinPalette.expense : Palette.warning)
                                    Text("en su punto más bajo")
                                        .font(.system(size: 9))
                                        .foregroundStyle(Palette.textFaint)
                                }
                            }
                            .padding(.vertical, 7)
                        }
                    }
                }
                .frame(maxHeight: 380)
            }
        }
        .padding(26)
        .sheetWidth(520)
        .background(Palette.surface)
    }

    private func fecha(_ key: String) -> String {
        DateFormatter.es("d 'de' MMMM").string(from: FinDate.date(key))
    }
}

// MARK: - Por pagar este mes

/// Los gastos fijos del mes, con un check al pagarlos. Pagar no mueve el
/// saldo —la proyección ya los cuenta el día que caen—; es para ver de un
/// vistazo qué falta.
struct PayablesCard: View {
    let month: MonthProjection
    let doc: FinancesDocument

    @Environment(FinanceStore.self) private var store

    private struct Item: Identifiable {
        let event: FinancialEvent
        let date: String
        let paid: Bool
        var id: String { event.id }
    }

    private var yearMonth: String { month.id }

    private var items: [Item] {
        month.days.flatMap { day in
            FinanceEngine.events(doc.events, on: day.date)
                .filter { $0.type == .expense }
                .map { Item(event: $0, date: day.date,
                            paid: doc.paidFixed.contains("\($0.id)|\(yearMonth)")) }
        }
        // Lo que falta arriba, por fecha; lo pagado abajo.
        .sorted { ($0.paid ? 1 : 0, $0.date) < ($1.paid ? 1 : 0, $1.date) }
    }

    var body: some View {
        let lista = items
        let falta = lista.filter { !$0.paid }.reduce(0) { $0 + $1.event.amount }
        FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Por pagar · \(FinDate.monthTitle(month.year, month.month))")
                        .microLabelStyle(Palette.textFaint, size: 9)
                    Spacer()
                    if !lista.isEmpty {
                        Text(falta > 0 ? "Quedan \(Money.format(falta, doc: doc))" : "Todo pagado")
                            .font(.system(size: 11, weight: .bold)).monospacedDigit()
                            .foregroundStyle(falta > 0 ? Palette.textMuted : FinPalette.income)
                            .contentTransition(.numericText(value: falta))
                    }
                }
                if lista.isEmpty {
                    Text("Sin gastos fijos este mes. Se agregan con Movimiento, marcando que se repite cada mes.")
                        .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    VStack(spacing: 2) {
                        ForEach(lista) { item in row(item) }
                    }
                }
            }
        }
        .animation(.smooth(duration: 0.35), value: lista.map(\.paid))
    }

    private func row(_ item: Item) -> some View {
        let vencido = !item.paid && item.date < FinDate.todayKey()
        return Button {
            SoundEffects.shared.play(item.paid ? .pop : .bell, enabled: true)
            withAnimation(.smooth(duration: 0.35)) {
                store.togglePaid(item.event.id, yearMonth: yearMonth)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: item.paid ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 15))
                    .foregroundStyle(item.paid ? FinPalette.income : Palette.textFaint)
                    .contentTransition(.symbolEffect(.replace))
                VStack(alignment: .leading, spacing: 1) {
                    Text(item.event.note.flatMap { $0.isEmpty ? nil : $0 } ?? item.event.category)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(item.paid ? Palette.textFaint : Palette.text)
                        .strikethrough(item.paid, color: Palette.textFaint)
                        .lineLimit(1)
                    Text(vencido ? "Vencía el \(DateFormatter.es("d").string(from: FinDate.date(item.date)))"
                                 : "El \(DateFormatter.es("d 'de' MMMM").string(from: FinDate.date(item.date)))")
                        .font(.system(size: 10))
                        .foregroundStyle(vencido ? Palette.warning : Palette.textFaint)
                }
                Spacer()
                Text(Money.format(item.event.amount, doc: doc))
                    .font(.system(size: 12, weight: .semibold)).monospacedDigit()
                    .foregroundStyle(item.paid ? Palette.textFaint : FinPalette.expense)
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Cierre del día

/// Una sola pregunta, sin juicio: ¿quedó algo sin anotar? Aparece por la
/// noche para hoy, y durante el día siguiente para ayer, sólo si ese día no
/// tiene nada anotado. Es lo que evita que un día sin gastos se cobre el
/// presupuesto entero.
struct DayCloseBanner: View {
    let onAddExpense: (String) -> Void

    @Environment(FinanceStore.self) private var store
    /// Los días que dejaste para después en este equipo.
    @AppStorage("fin.closeDay.later") private var laterRaw = ""

    /// Desde qué hora se pregunta por el día de hoy.
    private static let eveningHour = 19

    private var pending: String? {
        let ahora = Date()
        let hoy = FinDate.todayKey(ahora)
        let ayer = FinDate.todayKey(FinanceEngine.calendar.date(byAdding: .day, value: -1, to: ahora)!)
        let inicio = store.document.config.cycleStartYearMonth ?? ""
        let pospuestos = Set(laterRaw.split(separator: ",").map(String.init))
        let candidatos = [ayer] + (FinanceEngine.calendar.component(.hour, from: ahora) >= Self.eveningHour ? [hoy] : [])
        return candidatos.first { dia in
            dia >= inicio && !store.isDayAccounted(dia) && !pospuestos.contains(dia)
        }
    }

    var body: some View {
        if let dia = pending {
            let esHoy = dia == FinDate.todayKey()
            // En una línea si entra; en el teléfono, la pregunta arriba y los
            // botones abajo.
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 14) {
                    question(esHoy)
                    Spacer(minLength: 8)
                    buttons(dia)
                }
                VStack(alignment: .leading, spacing: 10) {
                    question(esHoy)
                    buttons(dia)
                }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 14).fill(FinPalette.daily.opacity(0.07)))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(FinPalette.daily.opacity(0.22), lineWidth: 1))
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }

    private func question(_ esHoy: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: esHoy ? "moon.stars" : "sunrise")
                .font(.system(size: 15))
                .foregroundStyle(FinPalette.daily)
            Text(esHoy ? "¿Hoy gastaste algo que no anotaste?" : "¿Ayer gastaste algo que no anotaste?")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .fixedSize()
        }
    }

    private func buttons(_ dia: String) -> some View {
        HStack(spacing: 14) {
            Button("No, nada") {
                SoundEffects.shared.play(.bell, enabled: true)
                withAnimation(.smooth(duration: 0.3)) { store.closeDayWithoutSpending(dia) }
            }
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Palette.onAccent)
            .padding(.horizontal, 12).frame(height: 28)
            .background(Capsule().fill(FinPalette.accent))
            Button("Sí, anotar") { onAddExpense(dia) }
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(FinPalette.income)
            Button("Después") {
                withAnimation(.smooth(duration: 0.3)) {
                    laterRaw = (laterRaw.isEmpty ? "" : laterRaw + ",") + dia
                }
            }
            .font(.system(size: 11))
            .foregroundStyle(Palette.textFaint)
        }
        .fixedSize()
    }
}


/// El anillo de una meta. Se llena con un pequeño rebote al abrir y, al
/// llegar al 100 %, destella una vez.
private struct GoalRing: View {
    let progress: Double

    @State private var shown: Double = 0
    @State private var flash = false

    var body: some View {
        ZStack {
            Circle().stroke(Palette.fill(0.08), lineWidth: 8)
            Circle()
                .trim(from: 0, to: shown)
                .stroke(FinPalette.income, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: FinPalette.income.opacity(flash ? 0.8 : 0), radius: flash ? 14 : 0)
        }
        .scaleEffect(flash ? 1.04 : 1)
        .onAppear { fill(to: progress) }
        .onChange(of: progress) { _, nuevo in fill(to: nuevo) }
    }

    private func fill(to value: Double) {
        withAnimation(.spring(response: 0.9, dampingFraction: 0.72)) { shown = value }
        guard value >= 1 else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            withAnimation(.easeOut(duration: 0.6)) { flash = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                withAnimation(.easeIn(duration: 0.5)) { flash = false }
            }
        }
    }
}
