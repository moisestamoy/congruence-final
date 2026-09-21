import SwiftUI

struct TodayView: View {
    @Environment(HabitStore.self) private var store
    @State private var selectedDate: Date = HabitDay.current()

    private var dayKey: String { HabitDay.key(selectedDate) }
    private var congruence: Int { store.congruence(on: dayKey) }
    private var streak: Int { store.streak() }
    private var level: Int { store.level(for: streak) }

    private static let headerFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es")
        f.dateFormat = "d MMM yyyy"
        return f
    }()

    var body: some View {
        GeometryReader { geo in
            let isWide = geo.size.width >= 820

            Group {
                if isWide {
                    HStack(alignment: .top, spacing: 28) {
                        dialPanel(size: min(geo.size.height * 0.42, 300))
                            .frame(maxWidth: .infinity)
                        habitsPanel
                            .frame(maxWidth: .infinity)
                    }
                    .padding(28)
                } else {
                    ScrollView {
                        VStack(spacing: 28) {
                            dialPanel(size: 220)
                            habitsPanel
                        }
                        .padding(20)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Palette.base)
    }

    // MARK: - Anillo

    private func dialPanel(size: CGFloat) -> some View {
        VStack {
            Spacer(minLength: 0)
            CongruenceDial(
                percentage: congruence,
                level: level,
                size: size,
                phrase: "La consistencia no es perfección. Es simplemente no rendirse nunca."
            )
            Spacer(minLength: 0)

            if streak > 0 {
                HStack(spacing: 6) {
                    Text("Racha")
                        .microLabelStyle(Palette.textFaint, size: 9)
                    Text("\(streak)")
                        .font(.system(size: 11, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.textMuted)
                    Text(streak == 1 ? "día" : "días")
                        .microLabelStyle(Palette.textFaint, size: 9)
                }
                .padding(.top, 12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.vertical, 24)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24).stroke(Palette.hairline, lineWidth: 1)
        )
    }

    // MARK: - Hábitos

    private var habitsPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            header

            if store.habits.isEmpty {
                Text("Todavía no hay hábitos.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.textFaint)
                    .padding(.vertical, 28)
                    .frame(maxWidth: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(store.habits) { habit in
                            HabitRow(
                                habit: habit,
                                day: dayKey,
                                onToggle: { store.toggle(habit.id, on: dayKey) },
                                onSetValue: { store.setValue($0, for: habit.id, on: dayKey) },
                                onSkip: { store.markSkip(habit.id, on: dayKey, status: $0) }
                            )
                        }
                    }
                    .padding(.vertical, 4)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24).stroke(Palette.hairline, lineWidth: 1)
        )
    }

    private var header: some View {
        HStack {
            Text("Hábitos")
                .font(.system(size: 20, weight: .bold))
                .tracking(-0.4)
                .foregroundStyle(Palette.text)

            Spacer()

            HStack(spacing: 4) {
                dateButton("chevron.left") { shiftDay(-1) }

                Text(Self.headerFormatter.string(from: selectedDate))
                    .font(.system(size: 11, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.textMuted)
                    .frame(minWidth: 96)

                dateButton("chevron.right") { shiftDay(1) }
                    .disabled(isToday)
                    .opacity(isToday ? 0.3 : 1)
            }
            .padding(4)
            .background(Palette.surfaceRaised, in: Capsule())
            .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
        }
        .padding(.bottom, 16)
    }

    private var isToday: Bool {
        dayKey == HabitDay.key(HabitDay.current())
    }

    private func shiftDay(_ days: Int) {
        selectedDate = HabitDay.adding(days, to: selectedDate)
    }

    private func dateButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 24, height: 22)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
