import SwiftUI

/// Opciones de reinicio (RestartModal.tsx): un ciclo nuevo desde un mes, o
/// borrar todo el historial financiero.
struct RestartSheet: View {
    enum Mode { case newCycle, hardReset }

    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var mode: Mode = .newCycle
    @State private var year: Int
    @State private var month: Int
    @State private var budgetText: String
    @State private var balanceText = ""
    @State private var clearFuture = false
    @State private var confirmingReset = false

    private static let indigo = Color(hex: "#818cf8")
    private static let rose = FinPalette.expense

    init(budget: Double) {
        let c = FinanceEngine.calendar.dateComponents([.year, .month], from: Date())
        _year = State(initialValue: c.year!)
        _month = State(initialValue: c.month!)
        _budgetText = State(initialValue: MonthTable.plain(budget))
    }

    private var budget: Double? {
        guard let v = Double(budgetText.replacingOccurrences(of: ",", with: ".")), v > 0 else { return nil }
        return v
    }

    private var balance: Double? {
        let t = balanceText.trimmingCharacters(in: .whitespaces)
        return t.isEmpty ? nil : Double(t.replacingOccurrences(of: ",", with: "."))
    }

    private var accent: Color { mode == .newCycle ? Self.indigo : Self.rose }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 10) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Self.indigo)
                    .frame(width: 30, height: 30)
                    .background(Self.indigo.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                Text("Opciones de reinicio").font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Palette.text)
            }

            HStack(spacing: 8) {
                tab("Nuevo ciclo", icon: "calendar.badge.clock", mode: .newCycle, color: Self.indigo)
                tab("Borrado total", icon: "exclamationmark.triangle", mode: .hardReset, color: Self.rose)
            }

            explainer

            field("Desde qué mes") { monthPicker }

            field("Presupuesto mensual") {
                DarkField(placeholder: "1500", text: $budgetText)
                if let budget {
                    Text("≈ \(Money.format((budget / Double(FinanceEngine.daysIn(year, month))).rounded(.up), doc: store.document)) por día")
                        .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                }
            }

            field(mode == .newCycle ? "Saldo inicial (opcional)" : "Saldo con el que empezás") {
                DarkField(placeholder: mode == .newCycle ? "Dejalo vacío para no cambiarlo" : "0",
                          text: $balanceText)
            }

            if mode == .newCycle {
                clearFutureToggle
            }

            HStack(spacing: 10) {
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
                Button(action: apply) {
                    Text(mode == .newCycle ? "Guardar ciclo" : "Sí, borrar todo")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(budget != nil ? (mode == .newCycle ? Color.black : .white) : Palette.textFaint)
                        .padding(.horizontal, 20)
                        .frame(height: 36)
                        .background(Capsule().fill(budget != nil ? accent : Color.white.opacity(0.06)))
                        .shadow(color: budget != nil ? accent.opacity(0.35) : .clear, radius: 12, y: 3)
                }
                .buttonStyle(.plain)
                .disabled(budget == nil)
            }
        }
        .padding(26)
        .frame(width: 520)
        .background(Palette.base)
        .animation(.smooth(duration: 0.2), value: mode)
        .confirmationDialog("¿Borrar todo tu historial financiero?", isPresented: $confirmingReset) {
            Button("Borrar todo", role: .destructive) {
                store.resetAll(year: year, month: month, budget: budget ?? 1500,
                               initialBalance: balance ?? 0)
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Se borran movimientos, fijos, metas y ajustes, también de la nube. Queda una copia en tu Mac, en la carpeta de respaldos.")
        }
    }

    private var explainer: some View {
        let isCycle = mode == .newCycle
        return VStack(alignment: .leading, spacing: 4) {
            Text(isCycle ? "Iniciar un nuevo ciclo" : "Eliminar todo el historial")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(accent)
            Text(isCycle
                 ? "Un presupuesto nuevo desde el mes que elijas, sin tocar los meses anteriores."
                 : "Borra de forma permanente todos los movimientos, fijos, metas y ajustes. Volvés a cero.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(accent.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(accent.opacity(0.2), lineWidth: 1))
    }

    private var monthPicker: some View {
        let names: [String] = DateFormatter.es("LLL").shortStandaloneMonthSymbols ?? []
        let thisYear = FinanceEngine.calendar.component(.year, from: Date())
        return VStack(alignment: .leading, spacing: 8) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 6), spacing: 6) {
                ForEach(1...12, id: \.self) { m in
                    Chip(label: names.indices.contains(m - 1) ? names[m - 1].capitalized : "\(m)",
                         isSelected: month == m, tint: accent, fillsWidth: true) { month = m }
                }
            }
            HStack(spacing: 6) {
                ForEach((thisYear - 2)...(thisYear + 2), id: \.self) { y in
                    Chip(label: String(y), isSelected: year == y, tint: accent, fillsWidth: true) { year = y }
                }
            }
        }
    }

    private var clearFutureToggle: some View {
        Button { clearFuture.toggle() } label: {
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 5)
                    .stroke(clearFuture ? Self.rose : Palette.textFaint, lineWidth: 1.5)
                    .background(RoundedRectangle(cornerRadius: 5).fill(clearFuture ? Self.rose : .clear))
                    .frame(width: 18, height: 18)
                    .overlay {
                        if clearFuture {
                            Image(systemName: "xmark").font(.system(size: 9, weight: .bold)).foregroundStyle(.white)
                        }
                    }
                VStack(alignment: .leading, spacing: 3) {
                    Text("Limpiar datos futuros")
                        .font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.text)
                    Text("Borra los gastos reales y los ajustes diarios desde \(FinDate.monthTitle(year, month)) en adelante. Tus fijos recurrentes se mantienen.")
                        .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12)
                .fill(clearFuture ? Self.rose.opacity(0.06) : Color.white.opacity(0.02)))
            .overlay(RoundedRectangle(cornerRadius: 12)
                .stroke(clearFuture ? Self.rose.opacity(0.3) : Palette.hairlineFaint, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func tab(_ title: String, icon: String, mode tabMode: Mode, color: Color) -> some View {
        let isActive = mode == tabMode
        return Button { mode = tabMode } label: {
            HStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 11, weight: .bold))
                Text(title).font(.system(size: 11, weight: .bold)).tracking(1).textCase(.uppercase)
            }
            .foregroundStyle(isActive ? color : Palette.textFaint)
            .frame(maxWidth: .infinity)
            .frame(height: 38)
            .background(RoundedRectangle(cornerRadius: 12).fill(isActive ? color.opacity(0.10) : .clear))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(isActive ? color.opacity(0.25) : Palette.hairlineFaint, lineWidth: 1))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func apply() {
        guard let budget else { return }
        switch mode {
        case .newCycle:
            store.startNewCycle(year: year, month: month, budget: budget,
                                initialBalance: balance, clearFuture: clearFuture)
            dismiss()
        case .hardReset:
            confirmingReset = true
        }
    }

    @ViewBuilder
    private func field<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            content()
        }
    }
}
