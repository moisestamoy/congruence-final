import SwiftUI

/// Las dos formas de mirar el día, igual que en la web.
/// `central` pone el anillo al medio con las tarjetas a los lados.
/// `split` le da la mitad izquierda entera al anillo.
enum RingLayout: String {
    case central
    case split

    var toggled: RingLayout { self == .central ? .split : .central }

    /// El ícono muestra a dónde vas, no dónde estás.
    var symbol: String { self == .central ? "rectangle.split.3x1" : "display" }
    var label: String { self == .central ? "Vista dividida" : "Vista central" }
}

struct TodayView: View {
    @Environment(HabitStore.self) private var store
    @Environment(IdentityStore.self) private var identity

    @AppStorage("ring_layout") private var layoutRaw = RingLayout.central.rawValue

    @State private var selectedDate: Date = HabitDay.current()
    @State private var section: AppSection = .habits
    @State private var isAddingHabit = false
    @State private var isEditingIdentity = false

    private var layout: RingLayout { RingLayout(rawValue: layoutRaw) ?? .central }

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
        HStack(spacing: 0) {
            Sidebar(selection: $section)

            GeometryReader { geo in
                let w = geo.size.width
                // Las tarjetas laterales sólo entran en vista central y con lugar.
                let showSidePanels = layout == .central && w >= 1180
                let showTwoColumns = w >= 860

                if section != .habits {
                    notBuiltYet
                } else if showTwoColumns {
                    HStack(alignment: .top, spacing: 24) {
                        if showSidePanels {
                            leftColumn.frame(width: 320)
                        }

                        ringHero
                            .frame(maxWidth: .infinity, maxHeight: .infinity)

                        // En vista dividida el panel respira más; en central se
                        // mantiene angosto para no comerle lugar al anillo.
                        habitsColumn.frame(
                            width: layout == .split ? max(380, min(w * 0.44, 720)) : 380
                        )
                    }
                    .padding(24)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            ringHero.frame(height: 520)
                            habitsColumn
                            leftColumn
                        }
                        .padding(20)
                    }
                }
            }
        }
        .background(Palette.base)
        .sheet(isPresented: $isAddingHabit) {
            AddHabitSheet { store.add($0) }
        }
        .sheet(isPresented: $isEditingIdentity) {
            @Bindable var identity = identity
            IdentityEditSheet(manifesto: $identity.manifesto) { identity.save() }
        }
    }

    /// Las otras secciones todavía viven sólo en la app web. Mejor decirlo que
    /// dejar un botón que no hace nada.
    private var notBuiltYet: some View {
        VStack(spacing: 10) {
            Image(systemName: section.symbol)
                .font(.system(size: 22, weight: .light))
                .foregroundStyle(Palette.textFaint)
            Text(section.label)
                .font(.system(size: 15, weight: .bold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(Palette.textMuted)
            Text("Todavía no está en la app nativa.\nPor ahora vive en la versión web.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.textFaint)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - El anillo, sin caja, tan grande como entre

    private var ringHero: some View {
        GeometryReader { geo in
            // Ojo: `size` es la caja, no el anillo. El anillo dibujado mide
            // 0.858 de esa caja (radio exterior 0.4 + el grosor del trazo), así
            // que para un diámetro visual dado hay que agrandar la caja.
            let byWidth = geo.size.width * 0.92 / 0.858
            // A lo alto compiten el anillo (0.858) y el bloque de abajo
            // (%, ESTABILIDAD y frase ≈ 0.32) más un piso fijo para la racha.
            let byHeight = (geo.size.height - 124) / 1.18
            let size = max(200, min(byWidth, byHeight, 1000))

            VStack(spacing: 0) {
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
                    .padding(.top, 20)
                    .padding(.bottom, 8)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
    }

    // MARK: - Columna izquierda

    private var leftColumn: some View {
        VStack(spacing: 20) {
            IdentityCard(manifesto: identity.manifesto)
                .onTapGesture { isEditingIdentity = true }
            NinetyDayCard(
                congruentDays: store.ninetyDayCongruentDays(),
                weekDots: store.congruenceWeekDots()
            )
            Spacer(minLength: 0)
        }
    }

    // MARK: - Columna de hábitos

    private var habitsColumn: some View {
        VStack(alignment: .leading, spacing: 0) {
            habitsHeader
                .padding(.bottom, 16)

            if store.habits.isEmpty {
                Text("Todavía no hay hábitos.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.textFaint)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 28)
            } else {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(store.habits) { habit in
                            HabitRow(
                                habit: habit,
                                day: dayKey,
                                weekDots: store.weekDots(for: habit),
                                onToggle: { store.toggle(habit.id, on: dayKey) },
                                onSetValue: { store.setValue($0, for: habit.id, on: dayKey) },
                                onSkip: { store.markSkip(habit.id, on: dayKey, status: $0) }
                            )
                        }
                    }
                }
                .scrollBounceBehavior(.basedOnSize)
            }

            addButton
                .padding(.top, 8)

            Spacer(minLength: 0)
        }
        .padding(20)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18).stroke(Palette.hairlineFaint, lineWidth: 1)
        )
    }

    private var habitsHeader: some View {
        HStack(spacing: 0) {
            Circle()
                .fill(Palette.accent)
                .frame(width: 5, height: 5)
                .padding(.trailing, 8)

            Text("Hábitos")
                .font(.system(size: 15, weight: .bold))
                .tracking(1.8)
                .textCase(.uppercase)
                .foregroundStyle(Palette.text)

            Spacer(minLength: 8)

            layoutToggle
                .padding(.trailing, 8)

            HStack(spacing: 2) {
                dateButton("chevron.left") { shiftDay(-1) }

                Text(Self.headerFormatter.string(from: selectedDate))
                    .font(.system(size: 11, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.textMuted)
                    .frame(minWidth: 88)

                dateButton("chevron.right") { shiftDay(1) }
                    .disabled(isToday)
                    .opacity(isToday ? 0.3 : 1)
            }
            .padding(3)
            .background(Color.white.opacity(0.03), in: Capsule())
            .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
        }
    }

    private var layoutToggle: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.28)) {
                layoutRaw = layout.toggled.rawValue
            }
        } label: {
            Image(systemName: layout.symbol)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 28, height: 26)
                .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8).stroke(Palette.hairlineFaint, lineWidth: 1)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(layout.label)
    }

    private var addButton: some View {
        Button {
            isAddingHabit = true
        } label: {
            Text("+ Nuevo objetivo")
                .microLabelStyle(Palette.textFaint, size: 10)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(
                            Color.white.opacity(0.08),
                            style: StrokeStyle(lineWidth: 1, dash: [4, 4])
                        )
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
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
