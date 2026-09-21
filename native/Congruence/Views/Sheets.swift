import SwiftUI

/// Paleta de los hábitos — la misma que ofrece la web.
private let habitColors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb7185", "#2dd4bf"]
private let habitIcons = ["💪", "⭐", "📚", "🥑", "🧠", "🌱", "🎸", "🏃", "💧", "🧘"]

struct AddHabitSheet: View {
    let onSave: (Habit) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var icon = "💪"
    @State private var color = habitColors[0]
    @State private var isNumeric = false
    @State private var goalText = "30"
    @State private var unit = "min"
    @State private var axis: IdentityAxis = .physical

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        SheetShell(title: "Nuevo objetivo", canSave: canSave, onCancel: { dismiss() }) {
            save()
        } content: {
            VStack(alignment: .leading, spacing: 20) {
                field("Nombre") {
                    TextField("Entrenar", text: $title)
                        .textFieldStyle(.plain)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Palette.text)
                        .padding(.horizontal, 12)
                        .frame(height: 38)
                        .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 9))
                        .overlay(
                            RoundedRectangle(cornerRadius: 9)
                                .stroke(Palette.hairlineFaint, lineWidth: 1)
                        )
                }

                field("Ícono") {
                    HStack(spacing: 6) {
                        ForEach(habitIcons, id: \.self) { option in
                            Button { icon = option } label: {
                                Text(option)
                                    .font(.system(size: 15))
                                    .frame(width: 32, height: 32)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(icon == option ? Color.white.opacity(0.08) : .clear)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                field("Color") {
                    HStack(spacing: 8) {
                        ForEach(habitColors, id: \.self) { option in
                            Button { color = option } label: {
                                Circle()
                                    .fill(Color(hex: option))
                                    .frame(width: 20, height: 20)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: color == option ? 2 : 0)
                                            .padding(-3)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                field("Eje de identidad") {
                    Picker("", selection: $axis) {
                        ForEach(IdentityAxis.allCases, id: \.self) { a in
                            Text(a.label).tag(a)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .tint(Palette.accent)
                }

                Toggle(isOn: $isNumeric) {
                    Text("Medir una cantidad")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                }
                .toggleStyle(.switch)
                .tint(Palette.accent)

                if isNumeric {
                    HStack(spacing: 12) {
                        field("Meta") {
                            TextField("30", text: $goalText)
                                .textFieldStyle(.plain)
                                .font(.system(size: 14, weight: .semibold))
                                .monospacedDigit()
                                .foregroundStyle(Palette.text)
                                .padding(.horizontal, 12)
                                .frame(width: 80, height: 38)
                                .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 9))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 9)
                                        .stroke(Palette.hairlineFaint, lineWidth: 1)
                                )
                        }
                        field("Unidad") {
                            TextField("min", text: $unit)
                                .textFieldStyle(.plain)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(Palette.text)
                                .padding(.horizontal, 12)
                                .frame(width: 100, height: 38)
                                .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 9))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 9)
                                        .stroke(Palette.hairlineFaint, lineWidth: 1)
                                )
                        }
                        Spacer()
                    }
                }
            }
        }
    }

    private func save() {
        let goal = isNumeric ? (Double(goalText) ?? 1) : 1
        onSave(Habit(
            id: UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespaces).uppercased(),
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
    private func field<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
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
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Soy una persona que…").microLabelStyle(Palette.textFaint, size: 9)
                    editor(text: $statement, height: 88)
                }
                VStack(alignment: .leading, spacing: 8) {
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
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 17, weight: .bold))
                .foregroundStyle(Palette.text)
                .padding(.bottom, 22)

            content

            Spacer(minLength: 24)

            HStack(spacing: 10) {
                Spacer()
                Button("Cancelar", action: onCancel)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 14)
                    .frame(height: 32)

                Button("Guardar", action: onSave)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(canSave ? Color.black : Palette.textFaint)
                    .padding(.horizontal, 18)
                    .frame(height: 32)
                    .background(
                        Capsule().fill(canSave ? Palette.accent : Color.white.opacity(0.06))
                    )
                    .shadow(color: canSave ? Palette.accent.opacity(0.35) : .clear,
                            radius: 14, y: 3)
                    .disabled(!canSave)
            }
        }
        .padding(26)
        .frame(width: 460)
        .background(Palette.base)
    }
}
