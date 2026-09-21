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

                // El tamaño del anillo se calcula acá, fuera de cualquier
                // GeometryReader anidado: así depende de `layout` (un estado) y
                // la animación del botón lo alcanza. Si dependiera de la
                // geometría interna, el cambio llegaría en otra pasada y saltaría.
                let habitsW: CGFloat = layout == .split
                    ? max(380, min(w * 0.44, 720))
                    : 380
                let sideW: CGFloat = showSidePanels ? 344 : 0
                let ringW = max(220, w - 48 - sideW - habitsW - 24)
                let ringSize = ringDiameter(width: ringW, height: geo.size.height - 48)

                if section != .habits {
                    notBuiltYet
                } else if showTwoColumns {
                    HStack(alignment: .center, spacing: 24) {
                        if showSidePanels {
                            leftColumn
                                .frame(width: 320)
                                .transition(
                                    .move(edge: .leading).combined(with: .opacity)
                                )
                        }

                        ringHero(size: ringSize)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)

                        // En vista dividida el panel respira más; en central se
                        // mantiene angosto para no comerle lugar al anillo.
                        habitsColumn.frame(width: habitsW)
                    }
                    .padding(24)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            ringHero(size: ringDiameter(width: w - 40, height: 560))
                                .frame(height: 560)
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

    /// Ojo: lo que recibe `CongruenceDial` es la caja, no el anillo. El anillo
    /// dibujado mide 0.858 de esa caja (radio exterior 0.4 más medio trazo a
    /// cada lado), así que para un diámetro visual dado hay que agrandar la caja.
    private func ringDiameter(width: CGFloat, height: CGFloat) -> CGFloat {
        let byWidth = width * 0.92 / 0.858
        // A lo alto el anillo se lleva lo que sobra después del bloque de abajo
        // (%, ESTABILIDAD y la frase) y de la racha, que ya no escalan.
        let byHeight = (height - 270) / 0.858
        return max(200, min(byWidth, byHeight, 1000))
    }

    private func ringHero(size: CGFloat) -> some View {
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
                                onToggle: { toggle(habit) },
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
            withAnimation(.smooth(duration: 0.45)) {
                layoutRaw = layout.toggled.rawValue
            }
        } label: {
            Image(systemName: layout.symbol)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Palette.textMuted)
                .contentTransition(.symbolEffect(.replace))
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

    /// Marcar un hábito numérico desde la fila lo lleva a la meta (o a cero si
    /// ya estaba cumplido); los botones +/- siguen sirviendo para el detalle.
    private func toggle(_ habit: Habit) {
        guard habit.type == .numeric else {
            store.toggle(habit.id, on: dayKey)
            return
        }
        let done = habit.log(on: dayKey)?.completed == true
        store.setValue(done ? 0 : habit.goal, for: habit.id, on: dayKey)
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
