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
        .frame(width: 560)
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
                Circle().stroke(Palette.fill(0.08), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(FinPalette.income, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.smooth(duration: 0.5), value: progress)
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
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: 5)) { _ in
                        AxisValueLabel().font(.system(size: 9))
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
        .frame(width: 520)
        .background(Palette.surface)
    }

    private func fecha(_ key: String) -> String {
        DateFormatter.es("d 'de' MMMM").string(from: FinDate.date(key))
    }
}
