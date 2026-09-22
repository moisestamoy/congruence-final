import SwiftUI

// MARK: - Detalle del día (DayDetailsModal.tsx)

/// A diferencia de la web, muestra también los fijos recurrentes que caen este
/// día aunque se hayan creado otro mes — en la web sólo aparecían el mes de origen.
struct DayDetailsSheet: View {
    let date: String

    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var editing: DayTransaction?
    @State private var adding: FlowType?

    private var transactions: [DayTransaction] { store.transactions(on: date) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(DateFormatter.es("d 'de' MMMM, yyyy").string(from: FinDate.date(date)))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Palette.text)
                    Text("Detalles del día").microLabelStyle(Palette.textFaint, size: 9)
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Palette.textMuted)
                        .frame(width: 28, height: 28)
                        .background(Palette.fill(0.05), in: Circle())
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.cancelAction)
            }
            .padding(.bottom, 24)

            section(.income)
                .padding(.bottom, 26)
            section(.expense)
        }
        .padding(26)
        .frame(width: 440)
        .background(Palette.base)
        .sheet(item: $editing) { tx in
            TransactionSheet(mode: .edit(tx, onDate: date))
        }
        .sheet(item: Binding(get: { adding.map(AddKey.init) }, set: { adding = $0?.type })) { key in
            TransactionSheet(mode: .new(date: date, type: key.type, askDate: false))
        }
    }

    private func section(_ type: FlowType) -> some View {
        let items = transactions.filter { $0.type == type }
        let color = type == .income ? FinPalette.income : FinPalette.expense
        return VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(type == .income ? "Entradas" : "Salidas").microLabelStyle(color, size: 10)
                Spacer()
                Button { adding = type } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus").font(.system(size: 9, weight: .bold))
                        Text("Agregar").font(.system(size: 10, weight: .bold)).tracking(1).textCase(.uppercase)
                    }
                    .foregroundStyle(color)
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
            if items.isEmpty {
                Text(type == .income ? "No hay entradas" : "No hay salidas")
                    .font(.system(size: 12)).italic()
                    .foregroundStyle(Palette.textFaint)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            } else {
                ForEach(items) { tx in
                    Button { editing = tx } label: { row(tx, color: color) }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    private func row(_ tx: DayTransaction, color: Color) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(tx.category.isEmpty ? "Sin categoría" : tx.category)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.text)
                if let note = tx.note, !note.isEmpty {
                    Text(note).font(.system(size: 11)).foregroundStyle(Palette.textFaint).lineLimit(1)
                }
            }
            if tx.isRecurring {
                HStack(spacing: 3) {
                    Image(systemName: "repeat").font(.system(size: 8, weight: .bold))
                    Text("Fijo").font(.system(size: 9, weight: .bold)).textCase(.uppercase)
                }
                .foregroundStyle(FinPalette.recurring)
                .padding(.horizontal, 6).padding(.vertical, 3)
                .background(FinPalette.recurring.opacity(0.12), in: Capsule())
                .help("Se repite el día \(tx.date.suffix(2)) de cada mes")
            }
            Spacer()
            Text((tx.type == .income ? "+" : "-") + Money.format(tx.amount, doc: store.document))
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
        }
        .padding(12)
        .background(color.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(color.opacity(0.12), lineWidth: 1))
        .contentShape(Rectangle())
    }
}

private struct AddKey: Identifiable {
    let type: FlowType
    var id: String { type.rawValue }
}

// MARK: - Movimiento: alta y edición (TransactionModal.tsx)

struct TransactionSheet: View {
    enum Mode {
        case new(date: String, type: FlowType, askDate: Bool)
        /// `onDate`: el día desde el que lo abriste. En un recurrente puede no
        /// ser su fecha original.
        case edit(DayTransaction, onDate: String)
    }

    let mode: Mode

    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var type: FlowType
    @State private var date: Date
    @State private var amountText: String
    @State private var category: String
    @State private var note: String
    @State private var isRecurring: Bool
    @State private var confirmingDelete = false

    init(mode: Mode) {
        self.mode = mode
        switch mode {
        case .new(let d, let t, _):
            _type = State(initialValue: t)
            _date = State(initialValue: FinDate.date(d))
            _amountText = State(initialValue: "")
            _category = State(initialValue: "")
            _note = State(initialValue: "")
            _isRecurring = State(initialValue: false)
        case .edit(let tx, _):
            _type = State(initialValue: tx.type)
            _date = State(initialValue: FinDate.date(tx.date))
            _amountText = State(initialValue: MonthTable.plain(tx.amount))
            _category = State(initialValue: tx.category)
            _note = State(initialValue: tx.note ?? "")
            _isRecurring = State(initialValue: tx.isRecurring)
        }
    }

    private var editing: DayTransaction? {
        if case .edit(let tx, _) = mode { return tx }
        return nil
    }

    private var asksForDateAndType: Bool {
        switch mode {
        case .new(_, _, let ask): return ask
        case .edit: return true
        }
    }

    private var amount: Double? {
        guard let v = Double(amountText.replacingOccurrences(of: ",", with: ".")), v > 0 else { return nil }
        return (v * 100).rounded() / 100
    }

    private var tint: Color { type == .income ? FinPalette.income : FinPalette.expense }

    private var categories: [String] {
        var list = type == .income ? FinanceCategories.income : FinanceCategories.expense
        // Una categoría que ya existe en tus datos pero no está en la lista (p. ej.
        // "🍔 Comida fuera") se ofrece igual, para no cambiártela al editar.
        if !category.isEmpty && !list.contains(category) { list.insert(category, at: 0) }
        return list
    }

    private var title: String {
        if editing != nil { return type == .income ? "Editar ingreso" : "Editar gasto" }
        return type == .income ? "Nueva entrada" : "Nuevo gasto"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.system(size: 18, weight: .bold)).foregroundStyle(tint)
                if !asksForDateAndType {
                    Text(DateFormatter.es("d 'de' MMMM").string(from: date))
                        .microLabelStyle(Palette.textFaint, size: 9)
                }
            }

            recurringToggle

            if asksForDateAndType {
                HStack(alignment: .top, spacing: 14) {
                    field("¿Qué tipo?") {
                        HStack(spacing: 6) {
                            Chip(label: "Gasto", isSelected: type == .expense, tint: FinPalette.expense,
                                 fillsWidth: true) { type = .expense }
                            Chip(label: "Ingreso", isSelected: type == .income, tint: FinPalette.income,
                                 fillsWidth: true) { type = .income }
                        }
                    }
                    field("¿Cuándo?") {
                        DatePicker("", selection: $date, displayedComponents: .date)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                            .environment(\.locale, Locale(identifier: "es"))
                    }
                }
            }

            field("Monto (\(Money.symbol(for: store.document.config.currency)))") {
                TextField("", text: $amountText, prompt: Text("0,00"))
                    .textFieldStyle(.plain)
                    .font(.system(size: 26, weight: .bold, design: .monospaced))
                    .foregroundStyle(Palette.text)
                    .padding(.horizontal, 14)
                    .frame(height: 52)
                    .background(Palette.inputBackground, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12)
                        .stroke(amount != nil ? tint.opacity(0.5) : Palette.hairlineFaint, lineWidth: 1))
            }

            field("Categoría") {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 6)], spacing: 6) {
                        ForEach(categories, id: \.self) { c in
                            Chip(label: c, isSelected: category == c, tint: tint, fillsWidth: true) {
                                category = c
                            }
                        }
                    }
                }
                .frame(maxHeight: 150)
            }

            field("Descripción (opcional)") {
                DarkField(placeholder: "Detalles…", text: $note)
            }

            HStack(spacing: 10) {
                if editing != nil {
                    Button("Eliminar") { confirmingDelete = true }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.negative)
                }
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
                Button(action: save) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark").font(.system(size: 10, weight: .bold))
                        Text(editing != nil ? "Guardar cambios" : "Agregar")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(amount != nil ? Palette.onAccent : Palette.textFaint)
                    .padding(.horizontal, 20)
                    .frame(height: 36)
                    .background(Capsule().fill(amount != nil ? tint : Palette.fill(0.06)))
                    .shadow(color: amount != nil ? tint.opacity(0.35) : .clear, radius: 12, y: 3)
                }
                .buttonStyle(.plain)
                .disabled(amount == nil)
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(26)
        .frame(width: 480)
        .background(Palette.base)
        .animation(.smooth(duration: 0.2), value: type)
        .confirmationDialog("¿Eliminar este registro?", isPresented: $confirmingDelete) {
            Button("Eliminar", role: .destructive) {
                if let editing { store.delete(editing) }
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            if editing?.isRecurring == true {
                Text("Es un fijo recurrente: se borra de todos los meses.")
            }
        }
    }

    private var recurringToggle: some View {
        let day = Calendar.current.component(.day, from: date)
        return Button { isRecurring.toggle() } label: {
            HStack(spacing: 12) {
                Image(systemName: "repeat")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(isRecurring ? Color(light: Color(hex: "#5b21b6"), dark: Color(hex: "#c4b5fd")) : Palette.textFaint)
                    .frame(width: 32, height: 32)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(isRecurring ? FinPalette.recurring.opacity(0.3) : Palette.fill(0.05))
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(isRecurring ? "Se repite cada mes" : "Repetir cada mes")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(isRecurring ? Color(light: Color(hex: "#4c1d95"), dark: Color(hex: "#ddd6fe")) : Palette.textMuted)
                    Text(isRecurring
                         ? "Se suma el día \(day) de todos los meses"
                         : "Para fijos: alquiler, salario, suscripciones…")
                        .font(.system(size: 10))
                        .foregroundStyle(isRecurring ? FinPalette.recurring : Palette.textFaint)
                }
                Spacer()
                Capsule()
                    .fill(isRecurring ? FinPalette.recurring : Palette.fill(0.1))
                    .frame(width: 40, height: 22)
                    .overlay(alignment: isRecurring ? .trailing : .leading) {
                        Circle().fill(.white).frame(width: 16, height: 16).padding(3)
                    }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isRecurring ? FinPalette.recurring.opacity(0.12) : Palette.fill(0.03))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isRecurring ? FinPalette.recurring.opacity(0.5) : Palette.hairline, lineWidth: 1.5)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: isRecurring)
    }

    private func save() {
        guard let amount else { return }
        let key = HabitDay.key(date)
        let cat = category.isEmpty ? (type == .income ? "🪙 Otros ingresos" : "📦 Otros") : category
        if let editing {
            store.update(editing, date: key, type: type, amount: amount, category: cat,
                         isRecurring: isRecurring, note: note)
        } else {
            store.add(date: key, type: type, amount: amount, category: cat,
                      isRecurring: isRecurring, note: note)
        }
        dismiss()
    }

    @ViewBuilder
    private func field<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            content()
        }
    }
}

// MARK: - Presupuesto mensual

struct BudgetSheet: View {
    let year: Int
    let month: Int

    @Environment(FinanceStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""

    private var currentBudget: Double {
        let ym = String(format: "%04d-%02d", year, month)
        let config = store.document.config
        return config.budgetChanges.sorted { $0.key > $1.key }
            .first { $0.key <= ym }?.value ?? config.monthlyFixedBudget
    }

    private var value: Double? { Double(text.replacingOccurrences(of: ",", with: ".")) }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Presupuesto variable").font(.system(size: 18, weight: .bold))
                    .foregroundStyle(FinPalette.income)
                Text("Para comida, salidas y gastos del día a día, desde \(FinDate.monthTitle(year, month)) en adelante.")
                    .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
            }
            DarkField(placeholder: MonthTable.plain(currentBudget), text: $text)
            if let value, value > 0 {
                let days = FinanceEngine.daysIn(year, month)
                Text("≈ \(Money.format((value / Double(days)).rounded(.up), doc: store.document)) por día")
                    .font(.system(size: 12, weight: .medium)).foregroundStyle(FinPalette.daily)
                Text("Borra los ajustes diarios que hayas hecho en ese mes.")
                    .font(.system(size: 11)).foregroundStyle(Palette.textFaint)
            }
            HStack {
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                Button("Guardar") {
                    if let value, value >= 0 { store.setMonthlyBudget(value, year: year, month: month) }
                    dismiss()
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(value != nil ? Palette.onAccent : Palette.textFaint)
                .padding(.horizontal, 20)
                .frame(height: 34)
                .background(Capsule().fill(value != nil ? FinPalette.accent : Palette.fill(0.06)))
                .disabled(value == nil)
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(26)
        .frame(width: 420)
        .background(Palette.base)
        .onAppear { text = MonthTable.plain(currentBudget) }
    }
}
