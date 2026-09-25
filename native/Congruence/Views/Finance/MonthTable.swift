import SwiftUI

/// La planilla de un mes (MonthSpreadsheet.tsx). Tocar ENTRADAS o SALIDAS abre
/// el detalle del día; DIARIO se edita en el lugar.
struct MonthTable: View {
    let month: MonthProjection
    let doc: FinancesDocument
    let onOpenDay: (String) -> Void
    let onSetDaily: (String, Double) -> Void

    @Environment(\.isCompact) private var isCompact

    private var columns: [GridItem] {
        if isCompact {
            // En el teléfono la fecha lleva el día debajo y el estado es un
            // punto de color: siete columnas no entran en 360 puntos.
            return [
                GridItem(.fixed(34), alignment: .leading),     // fecha y día
                GridItem(.flexible(), alignment: .trailing),   // entradas
                GridItem(.flexible(), alignment: .trailing),   // salidas
                GridItem(.fixed(58), alignment: .trailing),    // diario
                GridItem(.fixed(84), alignment: .trailing),    // saldo
                GridItem(.fixed(10), alignment: .trailing)     // estado
            ]
        }
        return [
            GridItem(.fixed(46), alignment: .leading),     // fecha
            GridItem(.fixed(40), alignment: .leading),     // día
            GridItem(.flexible(), alignment: .trailing),   // entradas
            GridItem(.flexible(), alignment: .trailing),   // salidas
            GridItem(.flexible(), alignment: .trailing),   // diario
            GridItem(.fixed(108), alignment: .trailing),   // saldo
            GridItem(.fixed(104), alignment: .trailing)    // estado
        ]
    }

    private var sidePadding: CGFloat { isCompact ? 12 : 20 }

    private var todayKey: String { FinDate.todayKey() }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 2).fill(FinPalette.accent)
                    .frame(width: 4, height: 20)
                    .shadow(color: FinPalette.accent.opacity(0.7), radius: 6)
                Text(FinDate.monthTitle(month.year, month.month))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Palette.text)
                Spacer()
                if !isCompact {
                    Text("Proyección mensual").microLabelStyle(Palette.textFaint.opacity(0.6), size: 9)
                }
            }
            .padding(.horizontal, sidePadding)
            .padding(.vertical, 16)
            .background(Palette.surfaceRaised)

            Divider().overlay(Palette.hairline)

            LazyVGrid(columns: columns, spacing: 0) {
                if isCompact {
                    head("Día")
                    head("Entra", FinPalette.income.opacity(0.8))
                    head("Sale", FinPalette.expense.opacity(0.8))
                    head("Diario", FinPalette.daily.opacity(0.8))
                    head("Saldo", Palette.text.opacity(0.8))
                    Color.clear.frame(width: 1, height: 1)
                } else {
                    head("Fecha"); head("Día")
                    head("Entradas", FinPalette.income.opacity(0.8))
                    head("Salidas", FinPalette.expense.opacity(0.8))
                    head("Diario", FinPalette.daily.opacity(0.8))
                    head("Saldo", Palette.text.opacity(0.8))
                    head("Estado")
                }
            }
            .padding(.horizontal, sidePadding)
            .padding(.vertical, 12)
            // Tapa las filas que pasan por debajo al hacer scroll. No puede
            // ser el color base opaco o abre un agujero en lo translúcido.
            .background(.regularMaterial)

            Divider().overlay(Palette.hairlineFaint)

            LazyVStack(spacing: 0) {
                ForEach(month.days) { day in
                    row(day)
                    Divider().overlay(Palette.fill(0.03))
                }
            }
        }
        .background(Palette.panel, in: RoundedRectangle(cornerRadius: 22))
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Palette.hairline, lineWidth: 1))
    }

    private func head(_ text: String, _ color: Color = Palette.textFaint) -> some View {
        Text(text).microLabelStyle(color, size: 9).lineLimit(1).fixedSize()
    }

    private func row(_ day: DayProjection) -> some View {
        let isToday = day.date == todayKey
        let date = FinDate.date(day.date)
        let out = day.fixedExpense + day.realExpense
        return LazyVGrid(columns: columns, spacing: 0) {
            if isCompact {
                VStack(alignment: .leading, spacing: 1) {
                    Text(DateFormatter.es("dd").string(from: date))
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundStyle(isToday ? FinPalette.daily : Palette.textFaint)
                    Text(DateFormatter.es("EEE").string(from: date).uppercased())
                        .font(.system(size: 7, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(Palette.textFaint.opacity(0.8))
                }
            } else {
                Text(DateFormatter.es("dd").string(from: date))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundStyle(isToday ? FinPalette.daily : Palette.textFaint)
                Text(DateFormatter.es("EEE").string(from: date).uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1)
                    .foregroundStyle(Palette.textFaint.opacity(0.8))
            }

            amountCell(day.income, color: FinPalette.income) { onOpenDay(day.date) }
            amountCell(out, color: FinPalette.expense) { onOpenDay(day.date) }

            DailyBudgetCell(value: day.plannedExpense) { onSetDaily(day.date, $0) }

            Text((day.balance < 0 ? "-" : "") + Money.format(day.balance, doc: doc))
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(day.balance >= 0 ? FinPalette.accent : FinPalette.expense)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            if isCompact {
                Circle().fill(FinPalette.status(day.status)).frame(width: 7, height: 7)
                    .accessibilityLabel(day.status.label)
            } else {
                StatusBadge(status: day.status)
            }
        }
        .padding(.horizontal, sidePadding)
        .padding(.vertical, 8)
        .background(isToday ? FinPalette.daily.opacity(0.06) : .clear)
    }

    private func amountCell(_ value: Double, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Group {
                if value > 0 {
                    Text(Self.plain(value))
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(color)
                } else {
                    Text("+").font(.system(size: 10)).foregroundStyle(color.opacity(0.25))
                }
            }
            .frame(maxWidth: .infinity, minHeight: 22, alignment: .trailing)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// Montos de la planilla sin símbolo, con céntimos sólo si los hay.
    static func plain(_ n: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "de-DE")
        // Sin separador de miles, como la web ("6373"). Además así un "1.500"
        // editado en la columna DIARIO no se lee como 1,5.
        f.usesGroupingSeparator = false
        f.maximumFractionDigits = 2
        f.minimumFractionDigits = n.truncatingRemainder(dividingBy: 1) == 0 ? 0 : 2
        return f.string(from: NSNumber(value: n)) ?? "\(n)"
    }
}

/// El presupuesto diario, editable en la misma celda.
///
/// Es un botón hasta que haces clic: si fuera un campo de texto siempre, macOS
/// le daría el foco al primero de la ventana al abrir Finanzas y cualquier
/// tecla sin querer te cambiaría el presupuesto de ese día.
private struct DailyBudgetCell: View {
    let value: Double
    let onCommit: (Double) -> Void

    @State private var isEditing = false
    @State private var draft = ""
    @FocusState private var focused: Bool

    var body: some View {
        Group {
            if isEditing {
                TextField("", text: $draft)
                    .textFieldStyle(.plain)
                    .multilineTextAlignment(.trailing)
                    .font(.system(size: 13, weight: .medium, design: .monospaced))
                    .foregroundStyle(Palette.text)
                    .focused($focused)
                    .onAppear { focused = true }
                    .onSubmit(commit)
                    .onChange(of: focused) { _, isFocused in if !isFocused { commit() } }
                    .onEscape { isEditing = false }
            } else {
                Button {
                    draft = MonthTable.plain(value)
                    isEditing = true
                } label: {
                    Text(MonthTable.plain(value))
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(Palette.text.opacity(0.5))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .contextMenu {
                    Button("Poner diario en 0") { onCommit(0) }
                }
                .help("Presupuesto para gastos variables de este día · clic para editar")
            }
        }
        .frame(width: 50, height: 22)
        .padding(.horizontal, 4)
        .background(RoundedRectangle(cornerRadius: 4)
            .fill(isEditing ? FinPalette.daily.opacity(0.10) : .clear))
    }

    private func commit() {
        guard isEditing else { return }
        isEditing = false
        let normalized = draft.replacingOccurrences(of: ",", with: ".")
        guard let v = Double(normalized), v != value else { return }
        onCommit(max(0, v))
    }
}

struct StatusBadge: View {
    let status: DayStatus

    var body: some View {
        let color = FinPalette.status(status)
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(status.label)
                .font(.system(size: 9, weight: .bold))
                .tracking(1.2)
                .textCase(.uppercase)
                .lineLimit(1)
                .fixedSize()
        }
        .foregroundStyle(color.opacity(0.9))
        .padding(.leading, 8)
        .padding(.trailing, 10)
        .padding(.vertical, 4)
        .background(color.opacity(0.10), in: Capsule())
    }
}
