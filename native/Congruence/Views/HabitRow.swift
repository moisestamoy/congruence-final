import SwiftUI

struct HabitRow: View {
    let habit: Habit
    let day: String
    /// Los últimos 7 días, del más viejo al más reciente.
    let weekDots: [Bool]
    let onToggle: () -> Void
    let onSetValue: (Double) -> Void
    let onSkip: (LogStatus) -> Void

    private var log: HabitLog? { habit.log(on: day) }
    private var isDone: Bool { log?.completed == true }
    private var isPaused: Bool { log?.isPaused == true }
    private var tint: Color { Color(hex: habit.color) }

    var body: some View {
        HStack(spacing: 0) {
            marker
                .padding(.trailing, 14)

            if let icon = habit.icon, !icon.isEmpty {
                Text(icon)
                    .font(.system(size: 14))
                    .padding(.trailing, 10)
            }

            Text(habit.title)
                .font(.system(size: 12, weight: .bold))
                .tracking(1.1)
                .foregroundStyle(statusColor)
                .strikethrough(isPaused, color: Palette.textFaint)
                .lineLimit(1)

            Spacer(minLength: 10)

            // Los hábitos numéricos muestran el contador; el resto, la semana.
            if habit.type == .numeric {
                numericControl
            } else {
                weekStrip
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isDone ? tint.opacity(0.22) : Palette.hairlineFaint, lineWidth: 1)
        )
        .opacity(isPaused ? 0.5 : 1)
        .contextMenu {
            Button("Marcar descanso") { onSkip(.rest) }
            Button("Marcar imprevisto") { onSkip(.emergency) }
        }
        .help(isPaused ? pauseLabel : (habit.subtitle ?? habit.title))
    }

    private var statusColor: Color {
        if isPaused { return Palette.textFaint }
        return isDone ? tint : Palette.textMuted
    }

    private var pauseLabel: String {
        if let reason = log?.pauseReason, !reason.isEmpty { return reason }
        return log?.status == .rest ? "Descanso" : "Imprevisto"
    }

    private var marker: some View {
        Button(action: onToggle) {
            ZStack {
                Circle()
                    .stroke(isDone ? tint : Palette.hairline, lineWidth: 1.5)
                    .frame(width: 20, height: 20)

                if isDone {
                    Circle()
                        .fill(tint)
                        .frame(width: 10, height: 10)
                        .shadow(color: tint.opacity(0.6), radius: 6)
                } else if isPaused {
                    Rectangle()
                        .fill(Palette.textFaint)
                        .frame(width: 9, height: 1.5)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(isPaused)
    }

    private var weekStrip: some View {
        HStack(spacing: 5) {
            ForEach(Array(weekDots.enumerated()), id: \.offset) { _, done in
                Circle()
                    .fill(done ? tint.opacity(0.85) : Color.white.opacity(0.10))
                    .frame(width: 4, height: 4)
            }
        }
    }

    private var numericControl: some View {
        HStack(spacing: 10) {
            stepButton("minus") {
                onSetValue(max(0, (log?.value ?? 0) - stepSize))
            }

            HStack(spacing: 3) {
                Text("\(Int(log?.value ?? 0))")
                    .font(.system(size: 14, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(isDone ? tint : Palette.text)
                Text("/ \(Int(habit.goal))\(habit.unit.map { " \($0)" } ?? "")")
                    .font(.system(size: 10))
                    .monospacedDigit()
                    .foregroundStyle(Palette.textFaint)
            }
            .frame(minWidth: 70, alignment: .trailing)

            stepButton("plus") {
                onSetValue((log?.value ?? 0) + stepSize)
            }
        }
        .disabled(isPaused)
    }

    /// Pasos redondos según la meta: de a 5 para metas grandes, de a 1 si es chica.
    private var stepSize: Double {
        habit.goal >= 30 ? 5 : 1
    }

    private func stepButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 22, height: 22)
                .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
}
