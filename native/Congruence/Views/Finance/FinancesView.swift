import SwiftUI

struct FinancesView: View {
    @Environment(FinanceStore.self) private var store

    @AppStorage("fin_horizon") private var horizon = 2
    @State private var viewYear: Int
    @State private var viewMonth: Int

    @State private var dayDetails: String?
    @State private var newTransaction = false
    @State private var editingBudget = false
    @State private var restarting = false
    @State private var showingGoals = false
    @State private var showingAlerts = false

    init() {
        let c = FinanceEngine.calendar.dateComponents([.year, .month], from: Date())
        _viewYear = State(initialValue: c.year!)
        _viewMonth = State(initialValue: c.month!)
    }

    private var doc: FinancesDocument { store.document }

    var body: some View {
        let months = FinanceEngine.months(from: viewYear, viewMonth, horizon: horizon, doc: doc)
        let viewed = months.first.map { FinanceEngine.stats(for: $0, doc: doc) } ?? .init()

        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header(alerts: FinanceAlerts.scan(months))
                MetricCards(doc: doc, stats: viewed,
                            onSetBalance: { store.setCurrentBalance($0) },
                            onOpenGoals: { showingGoals = true })
                controlBar

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 560), spacing: 22, alignment: .top)],
                          spacing: 22) {
                    ForEach(months) { month in
                        MonthTable(month: month, doc: doc,
                                   onOpenDay: { dayDetails = $0 },
                                   onSetDaily: { store.setDailyBudget($1, on: $0) })
                    }
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 520), spacing: 22, alignment: .top)],
                          spacing: 22) {
                    if let primero = months.first {
                        CashFlowCard(month: primero, doc: doc)
                    }
                    AnnualCard(doc: doc)
                }

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 520), spacing: 22, alignment: .top)],
                          spacing: 22) {
                    CategoryBreakdown(stats: viewed, doc: doc,
                                      title: FinDate.monthTitle(viewYear, viewMonth))
                    CategoryBudgetsPanel(stats: viewed, doc: doc)
                }
            }
            .padding(28)
            .frame(maxWidth: 1800)
            .frame(maxWidth: .infinity)
        }
        .sheet(item: Binding(get: { dayDetails.map(DayKey.init) },
                             set: { dayDetails = $0?.id })) { key in
            DayDetailsSheet(date: key.id)
        }
        .sheet(isPresented: $newTransaction) {
            TransactionSheet(mode: .new(date: FinDate.todayKey(), type: .expense, askDate: true))
        }
        .sheet(isPresented: $editingBudget) {
            BudgetSheet(year: viewYear, month: viewMonth)
        }
        .sheet(isPresented: $showingGoals) { SavingsGoalsSheet() }
        #if DEBUG
        // open Congruence.app --args -debugOpenGoals YES
        .onAppear {
            if UserDefaults.standard.bool(forKey: "debugOpenGoals") { showingGoals = true }
        }
        #endif
        .sheet(isPresented: $showingAlerts) {
            AlertsSheet(alerts: FinanceAlerts.scan(
                FinanceEngine.months(from: viewYear, viewMonth, horizon: horizon, doc: doc)), doc: doc)
        }
        .sheet(isPresented: $restarting) {
            RestartSheet(budget: doc.config.monthlyFixedBudget)
        }
    }

    // MARK: - Encabezado

    private func header(alerts: [FinanceAlerts.Alert]) -> some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Finanzas")
                    .font(.system(size: 40, weight: .black))
                    .tracking(-1)
                    .foregroundStyle(Palette.text)
                Text("Realidad financiera · tú decides qué hacer con ella")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(FinPalette.accent.opacity(0.6))
            }
            Spacer()
            alertsButton(alerts)
            Button { newTransaction = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus").font(.system(size: 10, weight: .bold))
                    Text("Movimiento").font(.system(size: 11, weight: .bold)).tracking(1).textCase(.uppercase)
                }
                .foregroundStyle(Palette.onAccent)
                .padding(.horizontal, 16)
                .frame(height: 36)
                .background(FinPalette.accent, in: RoundedRectangle(cornerRadius: 12))
                .shadow(color: FinPalette.accent.opacity(0.3), radius: 12)
            }
            .buttonStyle(.plain)
            .keyboardShortcut("n", modifiers: .command)
            .help("Nuevo ingreso o gasto (⌘N)")
        }
    }

    /// La campana cuenta los tramos en riesgo o en déficit de lo que estás
    /// viendo. Roja si alguno cae por debajo de cero.
    private func alertsButton(_ alerts: [FinanceAlerts.Alert]) -> some View {
        let criticas = alerts.contains(where: \.critical)
        return Button { showingAlerts = true } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: alerts.isEmpty ? "bell" : "bell.badge")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(alerts.isEmpty ? Palette.textFaint
                                     : criticas ? FinPalette.expense : Palette.warning)
                    .frame(width: 36, height: 36)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Palette.fill(0.04)))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Palette.hairlineFaint, lineWidth: 1))
                if !alerts.isEmpty {
                    Text("\(alerts.count)")
                        .font(.system(size: 8, weight: .black)).monospacedDigit()
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .frame(minWidth: 15, minHeight: 15)
                        .background(Capsule().fill(criticas ? FinPalette.expense : Palette.warning))
                        .offset(x: 5, y: -5)
                }
            }
        }
        .buttonStyle(.plain)
        .help(alerts.isEmpty ? "Sin alertas" : alerts.count == 1 ? "1 tramo en riesgo o déficit" : "\(alerts.count) tramos en riesgo o déficit")
    }

    // MARK: - Barra de control

    private var controlBar: some View {
        HStack(spacing: 10) {
            Button { restarting = true } label: {
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(FinPalette.expense)
                    .frame(width: 34, height: 34)
                    .background(FinPalette.expense.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(FinPalette.expense.opacity(0.2), lineWidth: 1))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("Reiniciar: nuevo ciclo o borrado total")

            HStack(spacing: 4) {
                ForEach([1, 2, 3, 4, 12], id: \.self) { m in
                    Button { withAnimation(.smooth(duration: 0.3)) { horizon = m } } label: {
                        Text(m == 12 ? "1A" : "\(m)M")
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.4)
                            .foregroundStyle(horizon == m ? FinPalette.income : Palette.textFaint)
                            .frame(minWidth: 34, minHeight: 28)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(horizon == m ? FinPalette.accent.opacity(0.18) : .clear)
                            )
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(3)
            .background(Palette.fill(0.04), in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.fill(0.07), lineWidth: 1))

            Spacer()

            Button { editingBudget = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "function").font(.system(size: 10, weight: .bold))
                    Text("Presupuesto").font(.system(size: 10, weight: .bold)).tracking(1.4).textCase(.uppercase)
                }
                .foregroundStyle(FinPalette.income)
                .padding(.horizontal, 14)
                .frame(height: 34)
                .background(FinPalette.accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(FinPalette.accent.opacity(0.2), lineWidth: 1))
            }
            .buttonStyle(.plain)

            HStack(spacing: 0) {
                navButton("chevron.left") { shift(-1) }
                Text(rangeTitle)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.8)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.text.opacity(0.85))
                    .frame(minWidth: 190)
                navButton("chevron.right") { shift(1) }
            }
            .padding(3)
            .background(Palette.inputBackground, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.fill(0.05), lineWidth: 1))
        }
    }

    private var rangeTitle: String {
        let first = FinDate.monthTitle(viewYear, viewMonth)
        guard horizon > 1 else { return first }
        var (y, m) = (viewYear, viewMonth)
        for _ in 1..<horizon { (y, m) = FinanceEngine.next(y, m) }
        return "\(first) – \(FinDate.monthTitle(y, m))"
    }

    private func shift(_ delta: Int) {
        withAnimation(.smooth(duration: 0.25)) {
            (viewYear, viewMonth) = delta > 0
                ? FinanceEngine.next(viewYear, viewMonth)
                : FinanceEngine.previous(viewYear, viewMonth)
        }
    }

    private func navButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 30, height: 28)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct DayKey: Identifiable { let id: String }

// MARK: - Tarjetas de métricas (MetricCardsRow.tsx)

struct MetricCards: View {
    let doc: FinancesDocument
    let stats: FinanceEngine.MonthStats
    let onSetBalance: (Double) -> Void
    var onOpenGoals: () -> Void = {}

    @State private var editingBalance = false
    @State private var draft = ""

    private func money(_ n: Double) -> String { Money.format(n, doc: doc) }

    /// El saldo al final de ESTE mes (el de hoy), aunque estés mirando otro.
    private var projectedEnd: Double {
        let c = FinanceEngine.calendar.dateComponents([.year, .month], from: Date())
        return FinanceEngine.months(from: c.year!, c.month!, horizon: 1, doc: doc)
            .first?.days.last?.balance ?? 0
    }

    private var currentBalance: Double {
        doc.config.actualBalanceDisplay ?? doc.config.initialBalance
    }

    private var currentSaved: Double {
        let year = String(FinanceEngine.calendar.component(.year, from: Date()))
        return currentBalance + doc.savingsEntries
            .filter { $0.date.hasPrefix(year) }
            .reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        if stats.income == 0 && stats.expenses == 0 {
            FinCard(padding: 44) {
                VStack(spacing: 10) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 26))
                        .foregroundStyle(Palette.textFaint)
                    Text("Sin datos para este período")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Palette.textMuted)
                    Text("Registra ingresos y gastos para ver tu realidad financiera. Los números, tal como son, sin juicios.")
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.textFaint)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
            }
        } else {
            // Las cuatro a la misma altura: en fila si entran, si no de a dos.
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: 16) {
                    projectedCard; netFlowCard; paceCard; goalCard
                }
                .fixedSize(horizontal: false, vertical: true)
                .frame(minWidth: 1000)

                VStack(spacing: 16) {
                    HStack(alignment: .top, spacing: 16) { projectedCard; netFlowCard }
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(alignment: .top, spacing: 16) { paceCard; goalCard }
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private func label(_ text: String) -> some View {
        Text(text).microLabelStyle(Palette.textFaint, size: 9)
    }

    private func bigNumber(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 32, weight: .black))
            .monospacedDigit()
            .tracking(-0.5)
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }

    private var projectedCard: some View {
        FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    label("Saldo proyectado fin de mes")
                    Spacer()
                    Image(systemName: projectedEnd >= 0 ? "arrow.up.right" : "arrow.down.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(projectedEnd >= 0 ? FinPalette.accent : FinPalette.expense)
                }
                bigNumber((projectedEnd < 0 ? "-" : "") + money(projectedEnd),
                          color: projectedEnd >= 0 ? Palette.text : FinPalette.expense)

                Divider().overlay(Palette.fill(0.05))

                HStack {
                    Text("Saldo actual").microLabelStyle(Palette.textFaint.opacity(0.8), size: 9)
                    Spacer()
                    if editingBalance {
                        HStack(spacing: 6) {
                            TextField("", text: $draft)
                                .textFieldStyle(.plain)
                                .font(.system(size: 12, design: .monospaced))
                                .padding(.horizontal, 8)
                                .frame(width: 110, height: 24)
                                .background(Palette.fill(0.08), in: RoundedRectangle(cornerRadius: 6))
                                .onSubmit(commitBalance)
                            Button("✓", action: commitBalance).buttonStyle(.plain)
                                .foregroundStyle(FinPalette.income)
                            Button("✕") { editingBalance = false }.buttonStyle(.plain)
                                .foregroundStyle(Palette.textFaint)
                        }
                        .font(.system(size: 12, weight: .bold))
                    } else {
                        Button {
                            draft = String(format: "%g", currentBalance)
                            editingBalance = true
                        } label: {
                            HStack(spacing: 5) {
                                Text(money(currentBalance)).monospacedDigit()
                                Image(systemName: "pencil").font(.system(size: 9))
                            }
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.textMuted)
                        }
                        .buttonStyle(.plain)
                        .help("Corrige tu saldo real de hoy")
                    }
                }

                if doc.monthlyGoal > 0 {
                    let reached = stats.net >= doc.monthlyGoal
                    VStack(spacing: 6) {
                        HStack {
                            Text("Meta mensual").microLabelStyle(Palette.textFaint, size: 8)
                            Spacer()
                            Text("\(money(max(0, stats.net))) / \(money(doc.monthlyGoal))")
                                .font(.system(size: 9, weight: .bold))
                                .monospacedDigit()
                                .foregroundStyle(reached ? FinPalette.income : Palette.textMuted)
                        }
                        ProgressLine(value: stats.net / doc.monthlyGoal,
                                     color: reached ? FinPalette.income : FinPalette.daily)
                    }
                }
            }
        }
    }

    private func commitBalance() {
        let normalized = draft.replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: ".")
        // Acepta "21563", "21.563" (de-DE) y "21563.5".
        if let v = Double(draft.replacingOccurrences(of: ",", with: ".")) ?? Double(normalized) {
            onSetBalance(v)
        }
        editingBalance = false
    }

    private var netFlowCard: some View {
        FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    label("Flujo neto del mes")
                    Spacer()
                    Image(systemName: stats.net >= 0 ? "plus" : "minus")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(stats.net >= 0 ? FinPalette.accent : FinPalette.expense)
                }
                bigNumber((stats.net >= 0 ? "+" : "-") + money(stats.net),
                          color: stats.net >= 0 ? FinPalette.income : FinPalette.expense)
                HStack {
                    Label(money(stats.income), systemImage: "plus")
                        .foregroundStyle(Palette.textFaint)
                    Spacer()
                    Label(money(stats.expenses), systemImage: "minus")
                        .foregroundStyle(Palette.textFaint)
                }
                .font(.system(size: 11))
                .monospacedDigit()
                .labelStyle(TightLabel())
            }
        }
    }

    private var paceCard: some View {
        let ratio = stats.income > 0 ? abs(stats.expenses) / stats.income : 0
        let color: Color = ratio > 0.9 ? Color(light: Color(hex: "#b45309"), dark: Color(hex: "#f59e0b")) : ratio > 0.7 ? Color(light: Color(hex: "#a16207"), dark: Color(hex: "#eab308")) : FinPalette.accent
        return FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    label("Ritmo de gasto vs ingresos")
                    Spacer()
                    Image(systemName: ratio > 0.9 ? "exclamationmark.circle" : "arrow.down.right")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(ratio > 0.9 ? Color(light: Color(hex: "#b45309"), dark: Color(hex: "#f59e0b")) : Palette.textFaint)
                }
                bigNumber("\(Int((ratio * 100).rounded()))%", color: Palette.text)
                ProgressLine(value: ratio, color: color, height: 5)
                Text(ratio > 0.9 ? "Gasto elevado respecto a ingresos" : "Dentro del rango habitual")
                    .microLabelStyle(Palette.textFaint, size: 8)
            }
        }
    }

    private var goalCard: some View {
        let goal = doc.annualGoal
        let saved = currentSaved
        let progress = min(saved / goal, 1)
        let monthsToGoal: Int? = stats.income > 0 && saved < goal
            ? Int(((goal - saved) / stats.income).rounded(.up)) : nil
        return FinCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    label("Velocidad meta anual")
                    Spacer()
                    Image(systemName: "trophy").font(.system(size: 12, weight: .bold))
                        .foregroundStyle(FinPalette.goal)
                }
                if saved >= goal {
                    Text("¡Meta cumplida!").font(.system(size: 26, weight: .black))
                        .foregroundStyle(FinPalette.income)
                    Text("Alcanzaste \(money(goal)) este año")
                        .font(.system(size: 11)).foregroundStyle(FinPalette.income.opacity(0.6))
                } else if let monthsToGoal,
                          let target = FinanceEngine.calendar.date(byAdding: .month, value: monthsToGoal, to: Date()) {
                    bigNumber(DateFormatter.es("MMM yy").string(from: target).capitalized, color: Palette.text)
                    Text("en \(monthsToGoal) meses · \(money(stats.income))/mes")
                        .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                } else {
                    Text("—").font(.system(size: 26, weight: .black)).foregroundStyle(Palette.textFaint)
                    Text("Registra ingresos para proyectar")
                        .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                }
                VStack(spacing: 6) {
                    HStack {
                        Text(money(saved)).foregroundStyle(Palette.textFaint)
                        Spacer()
                        Text("\(Int((progress * 100).rounded()))%").foregroundStyle(FinPalette.goal)
                    }
                    .font(.system(size: 9, weight: .bold))
                    .monospacedDigit()
                    ProgressLine(value: progress, color: FinPalette.goal)
                    HStack {
                        Text("Ver metas y aportes")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(FinPalette.goal.opacity(0.8))
                        Spacer()
                        Text("meta: \(money(goal))").font(.system(size: 9)).foregroundStyle(Palette.textFaint)
                    }
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: onOpenGoals)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: "Ver metas y aportes", onOpenGoals)
        .help("Metas de ahorro y aportes")
    }
}

private struct TightLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) {
            configuration.icon.font(.system(size: 8, weight: .bold))
            configuration.title
        }
    }
}

// MARK: - Categorías del mes (CategoryBreakdownWidget)

struct CategoryBreakdown: View {
    let stats: FinanceEngine.MonthStats
    let doc: FinancesDocument
    let title: String

    private static let colors = ["#6366f1", "#f59e0b", "#3b82f6", "#ef4444", "#f97316",
                                 "#a855f7", "#10b981", "#ec4899"].map(Color.tint)

    var body: some View {
        FinCard(padding: 24) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("En qué se va").font(.system(size: 17, weight: .bold)).foregroundStyle(Palette.text)
                    Text(title).microLabelStyle(Palette.textFaint, size: 9)
                    Spacer()
                    Text(Money.format(stats.expenses, doc: doc))
                        .font(.system(size: 13, weight: .bold)).monospacedDigit()
                        .foregroundStyle(FinPalette.expense)
                }
                if stats.categories.isEmpty {
                    Text("Sin gastos este mes.").font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                } else {
                    ForEach(Array(stats.categories.enumerated()), id: \.offset) { i, cat in
                        let color = Self.colors[i % Self.colors.count]
                        VStack(spacing: 6) {
                            HStack {
                                Circle().fill(color).frame(width: 7, height: 7)
                                Text(cat.name).font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Palette.textMuted)
                                Spacer()
                                Text(Money.format(cat.value, doc: doc))
                                    .font(.system(size: 12, weight: .semibold)).monospacedDigit()
                                    .foregroundStyle(Palette.text)
                                Text(stats.expenses > 0 ? "\(Int((cat.value / stats.expenses * 100).rounded()))%" : "")
                                    .font(.system(size: 10)).monospacedDigit()
                                    .foregroundStyle(Palette.textFaint)
                                    .frame(width: 34, alignment: .trailing)
                            }
                            ProgressLine(value: stats.expenses > 0 ? cat.value / stats.expenses : 0,
                                         color: color.opacity(0.8), height: 3)
                        }
                    }
                }
            }
        }
    }
}
