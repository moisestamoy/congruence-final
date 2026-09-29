import SwiftUI

/// El mes a punto de empezar: desde el 25 se ofrece preparar el siguiente;
/// antes, el que corre.
enum MonthStart {
    static func target(now: Date = Date()) -> (year: Int, month: Int) {
        let c = FinanceEngine.calendar.dateComponents([.year, .month, .day], from: now)
        let (y, m) = (c.year!, c.month!)
        return c.day! >= 25 ? FinanceEngine.next(y, m) : (y, m)
    }

    static func key(_ t: (year: Int, month: Int)) -> String {
        String(format: "%04d-%02d", t.year, t.month)
    }

    /// Se ofrece del 25 al 5: el borde entre un mes y otro, que es cuando
    /// uno se sienta a mirar la plata.
    static func isOffered(now: Date = Date()) -> Bool {
        let d = FinanceEngine.calendar.component(.day, from: now)
        return d >= 25 || d <= 5
    }
}

/// La invitación, arriba de Finanzas. Se puede dejar para después.
struct MonthStartBanner: View {
    let onStart: () -> Void

    @AppStorage("fin.monthStart.done") private var doneMonth = ""
    @AppStorage("fin.monthStart.later") private var laterMonth = ""

    var body: some View {
        let t = MonthStart.target()
        let clave = MonthStart.key(t)
        if MonthStart.isOffered(), doneMonth != clave, laterMonth != clave {
            let mes = FinDate.monthTitle(t.year, t.month).components(separatedBy: " ").first ?? ""
            HStack(spacing: 14) {
                Image(systemName: "calendar.badge.plus")
                    .font(.system(size: 15))
                    .foregroundStyle(FinPalette.accent)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Prepara \(mes.lowercased())")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Palette.text)
                    Text("Tu saldo, tu presupuesto, lo que entra y lo que pagas fijo. Un minuto.")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint)
                }
                Spacer(minLength: 8)
                Button("Empezar", action: onStart)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.onAccent)
                    .padding(.horizontal, 14).frame(height: 28)
                    .background(Capsule().fill(FinPalette.accent))
                Button("Ahora no") { withAnimation(.smooth(duration: 0.3)) { laterMonth = clave } }
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textFaint)
            }
            .buttonStyle(.pressable)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(RoundedRectangle(cornerRadius: Radius.card).fill(FinPalette.accent.opacity(0.07)))
            .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(FinPalette.accent.opacity(0.25), lineWidth: 1))
            .transition(.asymmetric(insertion: .opacity.combined(with: .move(edge: .top)),
                                    removal: .scale(scale: 0.94).combined(with: .opacity)))
        }
    }
}

/// Cuatro pasos, uno por pantalla: con cuánto empiezas, cuánto para el día a
/// día, qué entra y qué pagas fijo. Al final, todo queda cargado de una vez.
struct MonthStartSheet: View {
    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("fin.monthStart.done") private var doneMonth = ""

    private let target = MonthStart.target()

    @State private var step = 0
    @State private var forward = true
    @State private var balance = ""
    @State private var budget = ""
    @State private var incomes: [Line] = [Line(name: "Sueldo")]
    @State private var fixed: [Line] = [Line(name: "Arriendo")]

    struct Line: Identifiable {
        let id = UUID()
        var name: String = ""
        var amount: String = ""
        var day: String = "1"
    }

    private var monthName: String {
        (FinDate.monthTitle(target.year, target.month).components(separatedBy: " ").first ?? "").lowercased()
    }

    private var isFuture: Bool {
        MonthStart.key(target) > FinDate.todayKey().prefix(7).description
    }

    private var existing: [FinancialEvent] {
        store.document.events.filter(\.isRecurring)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("Prepara \(monthName)")
                    .font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.text)
                Spacer()
                HStack(spacing: 6) {
                    ForEach(0..<4, id: \.self) { i in
                        Capsule()
                            .fill(i <= step ? FinPalette.accent : Palette.fill(0.12))
                            .frame(width: i == step ? 18 : 6, height: 6)
                    }
                }
                .animation(.spring(response: 0.35, dampingFraction: 0.8), value: step)
            }

            ZStack(alignment: .topLeading) {
                Group {
                    switch step {
                    case 0: balanceStep
                    case 1: budgetStep
                    case 2: linesStep(title: "¿Qué entra cada mes?",
                                      hint: "Tu sueldo y cualquier ingreso fijo. Se repite solo cada mes.",
                                      lines: $incomes, type: .income)
                    default: linesStep(title: "¿Qué pagas fijo cada mes?",
                                       hint: "Arriendo, servicios, suscripciones. Aparecen en \"Por pagar\" el día que toca.",
                                       lines: $fixed, type: .expense)
                    }
                }
                .id(step)
                .transition(.asymmetric(
                    insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity),
                    removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity)))
            }
            .frame(minHeight: 250, alignment: .topLeading)
            .clipped()

            HStack {
                if step > 0 {
                    Button("Atrás") { go(-1) }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                } else {
                    Button("Cancelar") { dismiss() }
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.textMuted)
                        .keyboardShortcut(.cancelAction)
                }
                Spacer()
                Button(step == 3 ? "Empezar \(monthName)" : "Siguiente") {
                    step == 3 ? finish() : go(1)
                }
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Palette.onAccent)
                .padding(.horizontal, 20).frame(height: 34)
                .background(Capsule().fill(FinPalette.accent))
                .keyboardShortcut(.defaultAction)
            }
            .buttonStyle(.pressable)
        }
        .padding(26)
        .sheetWidth(520)
        .background(Palette.base)
        .onAppear {
            budget = MonthTable.plain(store.document.config.monthlyFixedBudget)
        }
    }

    // MARK: - Pasos

    private var balanceStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(isFuture ? "¿Con cuánto empiezas \(monthName)?" : "¿Cuánto tienes hoy?")
                .font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.text)
            Text(isFuture
                 ? "Lo que vas a tener en tus cuentas el día 1. Si no lo sabes exacto, pon una estimación y el 1 lo corriges en \"Saldo actual\"."
                 : "Lo que tienes ahora en tus cuentas, sumado. Es el punto de partida de todo lo demás.")
                .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                .fixedSize(horizontal: false, vertical: true)
            DarkField(placeholder: "Saldo", text: $balance)
        }
    }

    private var budgetStep: some View {
        let dias = FinanceEngine.daysIn(target.year, target.month)
        return VStack(alignment: .leading, spacing: 12) {
            Text("¿Cuánto para el día a día?")
                .font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.text)
            Text("Comida, transporte, salidas: lo que no es fijo. Con esto se calcula \"Hoy puedes gastar\".")
                .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                .fixedSize(horizontal: false, vertical: true)
            DarkField(placeholder: "Presupuesto del mes", text: $budget)
            if let v = number(budget), v > 0 {
                Text("≈ \(Money.format((v / Double(dias)).rounded(.up), doc: store.document)) por día")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(FinPalette.daily)
            }
        }
    }

    private func linesStep(title: String, hint: String, lines: Binding<[Line]>,
                           type: FlowType) -> some View {
        let yaCargados = existing.filter { $0.type == type }
        return VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.system(size: 16, weight: .semibold)).foregroundStyle(Palette.text)
            Text(hint).font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                .fixedSize(horizontal: false, vertical: true)

            if !yaCargados.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ya cargados").microLabelStyle(Palette.textFaint, size: 9)
                    ForEach(yaCargados) { e in
                        HStack {
                            Text(e.note ?? e.category).font(.system(size: 12))
                            Spacer()
                            Text("día \(e.date.suffix(2)) · \(Money.format(e.amount, doc: store.document))")
                                .font(.system(size: 11)).monospacedDigit()
                        }
                        .foregroundStyle(Palette.textMuted)
                    }
                }
            }

            ForEach(lines) { $line in
                HStack(spacing: 8) {
                    DarkField(placeholder: type == .income ? "Nombre" : "Qué es", text: $line.name)
                    DarkField(placeholder: "Monto", text: $line.amount, width: 110)
                    HStack(spacing: 4) {
                        Text("día").font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                        DarkField(placeholder: "1", text: $line.day, width: 52)
                    }
                    Button {
                        withAnimation(.smooth(duration: 0.2)) {
                            lines.wrappedValue.removeAll { $0.id == line.id }
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Palette.textFaint)
                            .frame(width: 24, height: 24)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.pressable)
                }
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Button {
                withAnimation(.smooth(duration: 0.2)) { lines.wrappedValue.append(Line()) }
            } label: {
                Label("Agregar otro", systemImage: "plus")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(FinPalette.accent)
            }
            .buttonStyle(.pressable)
        }
    }

    // MARK: - Acciones

    private func go(_ delta: Int) {
        forward = delta > 0
        withAnimation(.spring(response: 0.4, dampingFraction: 0.86)) { step += delta }
    }

    private func number(_ s: String) -> Double? {
        let limpio = s.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: " ", with: "")
        if let v = Double(limpio.replacingOccurrences(of: ",", with: "")) { return v }
        return Double(limpio.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: "."))
    }

    private func finish() {
        let lineas = incomes.map { ($0, FlowType.income) } + fixed.map { ($0, FlowType.expense) }
        store.startMonth(
            year: target.year, month: target.month,
            balance: number(balance),
            budget: number(budget) ?? store.document.config.monthlyFixedBudget,
            lines: lineas.compactMap { l, tipo in
                guard let monto = number(l.amount), monto > 0 else { return nil }
                return .init(type: tipo, name: l.name.trimmingCharacters(in: .whitespaces),
                             amount: monto, day: Int(l.day) ?? 1)
            })
        SoundEffects.shared.play(.bell, enabled: true)
        doneMonth = MonthStart.key(target)
        dismiss()
    }
}
