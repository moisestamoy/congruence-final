import SwiftUI

/// Paleta de los hábitos — la misma que ofrece la web.
private let habitColors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185", "#2dd4bf"]
private let habitIcons = ["💪", "⭐", "📚", "🥑", "🧠", "🌱", "🎸", "🏃", "💧", "🧘"]

/// Crear y editar usan la misma hoja: si `existing` viene, se precarga y se
/// guarda sobre el mismo id (el historial lo conserva el store).
struct HabitEditorSheet: View {
    let existing: Habit?
    let onSave: (Habit) -> Void
    var onDelete: (() -> Void)?

    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var icon: String
    @State private var color: String
    @State private var isNumeric: Bool
    @State private var goalText: String
    @State private var unit: String
    @State private var axis: IdentityAxis
    @State private var confirmingDelete = false

    init(existing: Habit? = nil,
         onSave: @escaping (Habit) -> Void,
         onDelete: (() -> Void)? = nil) {
        self.existing = existing
        self.onSave = onSave
        self.onDelete = onDelete
        _title = State(initialValue: existing?.title ?? "")
        _icon = State(initialValue: existing?.icon ?? "💪")
        _color = State(initialValue: existing?.color ?? habitColors[0])
        _isNumeric = State(initialValue: existing?.type == .numeric)
        _goalText = State(initialValue: existing.map { String(Int($0.goal)) } ?? "30")
        _unit = State(initialValue: existing?.unit ?? "min")
        _axis = State(initialValue: existing?.identityAxis ?? .physical)
    }

    private var trimmed: String {
        title.trimmingCharacters(in: .whitespaces)
    }

    private var canSave: Bool { !trimmed.isEmpty }
    private var tint: Color { Color(hex: color) }

    /// El hábito tal como quedará. Se arma con los mismos datos que se guardan,
    /// así que la vista previa no puede mentir.
    private var draft: Habit {
        Habit(
            id: "preview",
            title: trimmed.isEmpty ? "Tu hábito" : trimmed.uppercased(),
            subtitle: nil,
            type: isNumeric ? .numeric : .boolean,
            goal: max(Double(goalText) ?? 1, 1),
            unit: isNumeric ? unit : nil,
            color: color,
            icon: icon,
            identityAxis: axis,
            logs: ["preview": HabitLog(date: "preview", completed: true,
                                       value: isNumeric ? (Double(goalText) ?? 1) : nil)],
            isDemo: false
        )
    }

    var body: some View {
        SheetShell(
            title: existing == nil ? "Nuevo objetivo" : "Editar objetivo",
            canSave: canSave,
            onCancel: { dismiss() },
            onSave: save,
            onDelete: onDelete == nil ? nil : { confirmingDelete = true }
        ) {
            VStack(alignment: .leading, spacing: 22) {
                preview

                section("Nombre") {
                    DarkField(placeholder: "Entrenar", text: $title)
                }

                section("Ícono") {
                    HStack(spacing: 4) {
                        ForEach(habitIcons, id: \.self) { option in
                            Button { icon = option } label: {
                                Text(option)
                                    .font(.system(size: 16))
                                    .frame(width: 34, height: 34)
                                    .background(
                                        RoundedRectangle(cornerRadius: 9)
                                            .fill(icon == option ? tint.opacity(0.14) : .clear)
                                    )
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 9)
                                            .stroke(icon == option ? tint.opacity(0.5) : .clear,
                                                    lineWidth: 1)
                                    )
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .animation(.smooth(duration: 0.2), value: icon)
                }

                section("Color") {
                    HStack(spacing: 10) {
                        ForEach(habitColors, id: \.self) { option in
                            Button { color = option } label: {
                                Circle()
                                    .fill(Color(hex: option))
                                    .frame(width: 20, height: 20)
                                    .overlay(
                                        Circle()
                                            .stroke(Color(hex: option).opacity(0.5),
                                                    lineWidth: color == option ? 2 : 0)
                                            .padding(-4)
                                    )
                                    .contentShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                        Spacer()
                    }
                    .animation(.smooth(duration: 0.2), value: color)
                }

                section("Eje de identidad") {
                    LazyVGrid(
                        columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3),
                        spacing: 8
                    ) {
                        ForEach(IdentityAxis.allCases, id: \.self) { option in
                            Chip(label: option.label,
                                 isSelected: axis == option,
                                 tint: tint,
                                 fillsWidth: true) { axis = option }
                        }
                    }
                }

                Divider().overlay(Palette.hairlineFaint)

                section("Cómo se cumple") {
                    HStack(spacing: 8) {
                        Chip(label: "Sí o no", isSelected: !isNumeric, tint: tint) {
                            isNumeric = false
                        }
                        Chip(label: "Una cantidad", isSelected: isNumeric, tint: tint) {
                            isNumeric = true
                        }
                        Spacer()
                    }
                }

                if isNumeric {
                    HStack(alignment: .bottom, spacing: 12) {
                        section("Meta") {
                            DarkField(placeholder: "30", text: $goalText, width: 80)
                        }
                        section("Unidad") {
                            DarkField(placeholder: "min", text: $unit, width: 110)
                        }
                        Spacer()
                    }
                }
            }
            .animation(.smooth(duration: 0.25), value: isNumeric)
        }
        .confirmationDialog(
            "¿Borrar \(existing?.title ?? "este hábito")?",
            isPresented: $confirmingDelete
        ) {
            Button("Borrar hábito y su historial", role: .destructive) {
                onDelete?()
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Se pierden todos los días registrados. No se puede deshacer.")
        }
    }

    /// La fila real, con el componente real, mostrada como se verá al cumplirla.
    private var preview: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Así se va a ver").microLabelStyle(Palette.textFaint, size: 9)

            HabitRow(
                habit: draft,
                day: "preview",
                weekDots: Array(repeating: false, count: 7),
                onToggle: {},
                onSetValue: { _ in },
                onSkip: { _ in }
            )
            .allowsHitTesting(false)
        }
    }

    private func save() {
        let goal = isNumeric ? (Double(goalText) ?? 1) : 1
        onSave(Habit(
            id: existing?.id ?? UUID().uuidString,
            title: trimmed.uppercased(),
            subtitle: nil,
            type: isNumeric ? .numeric : .boolean,
            goal: max(goal, 1),
            unit: isNumeric ? unit : nil,
            color: color,
            icon: icon,
            identityAxis: axis,
            logs: [:],
            isDemo: false
        ))
        dismiss()
    }

    @ViewBuilder
    private func section<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            content()
        }
    }
}

struct IdentityEditSheet: View {
    @Binding var manifesto: IdentityManifesto
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var statement = ""
    @State private var goal = ""

    var body: some View {
        SheetShell(title: "Tu identidad", canSave: true, onCancel: { dismiss() }) {
            manifesto.identityStatement = statement.trimmingCharacters(in: .whitespacesAndNewlines)
            manifesto.ninetyDayGoal = goal.trimmingCharacters(in: .whitespacesAndNewlines)
            onSave()
            dismiss()
        } content: {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 9) {
                    Text("Soy una persona que…").microLabelStyle(Palette.textFaint, size: 9)
                    editor(text: $statement, height: 88)
                }
                VStack(alignment: .leading, spacing: 9) {
                    Text("En 90 días").microLabelStyle(Palette.textFaint, size: 9)
                    editor(text: $goal, height: 66)
                }
            }
        }
        .onAppear {
            statement = manifesto.identityStatement
            goal = manifesto.ninetyDayGoal
        }
    }

    private func editor(text: Binding<String>, height: CGFloat) -> some View {
        TextEditor(text: text)
            .font(.system(size: 13))
            .foregroundStyle(Palette.text)
            .scrollContentBackground(.hidden)
            .padding(8)
            .frame(height: height)
            .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 9))
            .overlay(
                RoundedRectangle(cornerRadius: 9).stroke(Palette.hairlineFaint, lineWidth: 1)
            )
    }
}

/// Marco compartido de las hojas: título, contenido y los dos botones.
struct SheetShell<Content: View>: View {
    let title: String
    let canSave: Bool
    let onCancel: () -> Void
    let onSave: () -> Void
    var onDelete: (() -> Void)? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(Palette.text)
                .padding(.bottom, 22)

            content

            Spacer(minLength: 26)

            HStack(spacing: 10) {
                if let onDelete {
                    Button("Borrar", action: onDelete)
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.negative)
                        .frame(height: 34)
                        .contentShape(Rectangle())
                }

                Spacer()

                Button("Cancelar", action: onCancel)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 14)
                    .frame(height: 34)
                    .contentShape(Rectangle())

                Button("Guardar", action: onSave)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(canSave ? Color.black : Palette.textFaint)
                    .padding(.horizontal, 20)
                    .frame(height: 34)
                    .background(
                        Capsule().fill(canSave ? Palette.accent : Color.white.opacity(0.06))
                    )
                    .shadow(color: canSave ? Palette.accent.opacity(0.35) : .clear,
                            radius: 14, y: 3)
                    .contentShape(Capsule())
                    .disabled(!canSave)
                    .animation(.smooth(duration: 0.25), value: canSave)
            }
        }
        .padding(26)
        .frame(width: 480)
        .background(Palette.base)
    }
}
