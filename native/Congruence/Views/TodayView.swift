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
    @Environment(TaskStore.self) private var tasks
    @Environment(FinanceStore.self) private var finance
    @Environment(\.isCompact) private var isCompact
    /// El día en que ya se ofreció escribir al cerrar. Una vez por día y
    /// basta: un aviso que insiste deja de ser una señal y pasa a ser ruido.
    @AppStorage("closeNudge.day") private var nudgedDay = ""
    @State private var showCloseNudge = false
    /// Una vez por día: los anillos celebran al completarse.
    @AppStorage("ring.celebratedDay") private var celebratedDay = ""
    @State private var celebrate = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @AppStorage("ring_layout") private var layoutRaw = RingLayout.central.rawValue

    @State private var selectedDate: Date = HabitDay.current()
    @State private var isAddingHabit = false
    @Environment(\.phonePlus) private var phonePlus
    @State private var editingReminder = false
    @AppStorage(HabitReminder.enabledKey) private var reminderOn = false
    @State private var isEditingIdentity = false
    @State private var editingHabit: Habit?
    @State private var deletingHabit: Habit?

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
        Group {
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

                if showTwoColumns {
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
                        habitsColumn(maxListHeight: max(180, geo.size.height - 260))
                            .frame(width: habitsW)
                    }
                    .padding(24)
                } else {
                    // En el teléfono el anillo cede lugar: los hábitos son lo
                    // que se toca, y tienen que asomar sin hacer scroll.
                    // En el iPhone, chico y sin la frase: con 480 puntos de
                    // anillo los hábitos quedaban debajo del pliegue y había
                    // que bajar para marcar uno, que es a lo que se viene.
                    if isCompact {
                        switch UserDefaults.standard.string(forKey: "homeVariant") {
                        case "A": homeVariantA
                        case "B": homeVariantB
                        case "C": homeVariantC
                        case "D": homeVariantD
                        case "E": homeVariantE
                        case "F": homeVariantF
                        case "G": homeVariantG
                        case "H": homeVariantH
                        case "I": homeVariantI
                        case "E1": variantE1
                        case "E2": variantE2
                        case "E3": variantE3
                        case "E4": variantE4
                        case "E5": variantE5
                        case "E6": variantE6
                        case "E7": compactHome(dark: true)
                        case "E8": compactHome(dark: false)
                        default: phoneHome
                        }
                    } else {
                        ScrollView {
                            VStack(spacing: 24) {
                                ringHero(size: ringDiameter(width: w - 40, height: 560))
                                    .frame(height: 560)
                                habitsColumn(maxListHeight: 4000)
                                leftColumn
                            }
                            .padding(20)
                        }
                    }
                }
            }
        }
        #if DEBUG
        // Para revisar la hoja sin tener que hacer clic:
        // open Congruence.app --args -debugOpenAddHabit YES
        .onAppear {
            if UserDefaults.standard.bool(forKey: "debugOpenAddHabit") {
                isAddingHabit = true
            }
            // open Congruence.app --args -debugEditFirstHabit YES
            if UserDefaults.standard.bool(forKey: "debugEditFirstHabit") {
                editingHabit = store.habits.first
            }
        }
        #endif
        .sheet(isPresented: $editingReminder) { HabitReminderSheet() }
        // Al marcar el primer hábito del día, el recordatorio de hoy se quita.
        .onChange(of: store.congruence(on: HabitDay.key(HabitDay.current()))) { _, _ in
            HabitReminder.reschedule(habits: store)
        }
        // El + de la barra del teléfono, en Hábitos, crea un hábito.
        .onChange(of: phonePlus.tick) { isAddingHabit = true }
        .sheet(isPresented: $isAddingHabit) {
            HabitEditorSheet(onSave: { store.add($0) })
        }
        .sheet(item: $editingHabit) { habit in
            HabitEditorSheet(
                existing: habit,
                onSave: { store.update($0) },
                onDelete: { store.remove(habit.id) }
            )
        }
        .confirmationDialog(
            "¿Borrar \(deletingHabit?.title ?? "este hábito")?",
            isPresented: Binding(
                get: { deletingHabit != nil },
                set: { if !$0 { deletingHabit = nil } }
            )
        ) {
            Button("Borrar hábito y su historial", role: .destructive) {
                if let h = deletingHabit { store.remove(h.id) }
                deletingHabit = nil
            }
            Button("Cancelar", role: .cancel) { deletingHabit = nil }
        } message: {
            Text("Se pierden todos los días registrados. No se puede deshacer.")
        }
        .sheet(isPresented: $isEditingIdentity) {
            @Bindable var store = store
            IdentityEditSheet(manifesto: $store.manifesto) {}
        }
    }

    // MARK: - El teléfono

    @State private var homeScrollY: CGFloat = 0

    /// El inicio del teléfono. Al abrir, el anillo grande al centro con el
    /// número debajo. Al bajar, se transforma siguiendo el dedo: el anillo se
    /// achica y va a la izquierda, el número sube a su derecha, aparece la
    /// frase, y esa cabecera queda fija arriba mientras bajas por los hábitos.
    private var phoneHome: some View {
        GeometryReader { geo in
            let W = geo.size.width
            let alto = HomeHero.alturaAbierto(conRacha: streak > 0)
            let recorrido = alto - HomeHero.alturaCerrado
            let p = min(max(homeScrollY / recorrido, 0), 1)

            ScrollView {
                VStack(spacing: 18) {
                    // El lugar del anillo grande: el anillo en sí vive arriba,
                    // fijo, y se transforma mientras esto sube.
                    Color.clear.frame(height: alto - 20)
                    habitsColumn(maxListHeight: 4000)
                    leftColumn
                }
                .padding(20)
            }
            .modifier(ScrollOffsetReader(offset: $homeScrollY))
            .overlay(alignment: .top) {
                HomeHero(p: p, width: W, percentage: congruence, level: level,
                         streak: streak, celebrate: celebrate)
                    .frame(height: alto - p * recorrido, alignment: .top)
                    .background(alignment: .bottom) {
                        // Ya cerrada, la cabecera tapa lo que pasa por debajo.
                        Palette.base
                            .overlay(alignment: .bottom) {
                                Rectangle().fill(Palette.hairlineFaint).frame(height: 1)
                                    .opacity(p >= 1 ? 1 : 0)
                            }
                            .ignoresSafeArea(edges: .top)
                    }
                    .allowsHitTesting(false)
            }
        }
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

    private func ringHero(size: CGFloat,
                          phrase: String? = "La consistencia no es perfección. Es simplemente no rendirse nunca.") -> some View {
        VStack(spacing: 0) {
            Spacer(minLength: 0)

            CongruenceDial(
                percentage: congruence,
                level: level,
                size: size,
                phrase: phrase,
                celebrate: celebrate
            )
            .sensoryFeedback(.impact(weight: .heavy), trigger: celebrate)

            Spacer(minLength: 0)

            if streak > 0 {
                HStack(spacing: 6) {
                    Text("Racha")
                        .microLabelStyle(Palette.textFaint, size: 9)
                    Text("\(streak)")
                        .font(.system(size: 11, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.textMuted)
                        .contentTransition(.numericText())
                        // Al subir, el número se asienta con un golpe corto.
                        .keyframeAnimator(initialValue: 1.0, trigger: reduceMotion ? 0 : streak) { vista, escala in
                            vista.scaleEffect(escala)
                        } keyframes: { _ in
                            SpringKeyframe(1.35, duration: 0.14)
                            SpringKeyframe(1.0, duration: 0.4, spring: .bouncy)
                        }
                        // Cada siete días, un brillo discreto.
                        .shadow(color: streak % 7 == 0 ? Palette.accent.opacity(0.7) : .clear,
                                radius: 6)
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
            IdentityCard(manifesto: store.manifesto)
                .onTapGesture { isEditingIdentity = true }
            NinetyDayCard(
                congruentDays: store.ninetyDayCongruentDays(),
                weekDots: store.congruenceWeekDots()
            )
        }
    }

    // MARK: - Columna de hábitos

    /// Alto exacto de la lista: 56 de fila más 8 de separación. Sin esto el
    /// `ScrollView` se estira a toda la altura disponible y la tarjeta queda
    /// con media pantalla de blanco debajo de tres hábitos.
    private var listContentHeight: CGFloat {
        let n = CGFloat(store.habits.count)
        return n * 56 + max(0, n - 1) * 8
    }

    private func habitsColumn(maxListHeight: CGFloat) -> some View {
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
                        ForEach(Array(store.habits.enumerated()), id: \.element.id) { indice, habit in
                            HabitRow(
                                habit: habit,
                                day: dayKey,
                                weekDots: store.weekDots(for: habit),
                                weekCount: store.weekCount(for: habit),
                                onToggle: { toggle(habit) },
                                onSetValue: { store.setValue($0, for: habit.id, on: dayKey) },
                                onSkip: { store.markSkip(habit.id, on: dayKey, status: $0) },
                                onEdit: { editingHabit = habit },
                                onMove: { offset in
                                    withAnimation(.smooth(duration: 0.3)) {
                                        store.move(habit.id, by: offset)
                                    }
                                },
                                onDelete: { deletingHabit = habit }
                            )
                            .staggeredAppear(indice)
                            // Arrastrar una fila sobre otra la pone en su lugar.
                            .draggable(habit.id)
                            .dropDestination(for: String.self) { ids, _ in
                                guard let dragged = ids.first else { return false }
                                withAnimation(.smooth(duration: 0.3)) {
                                    store.move(dragged, onto: habit.id)
                                }
                                return true
                            }
                        }
                    }
                }
                .scrollBounceBehavior(.basedOnSize)
                .frame(maxHeight: min(listContentHeight, maxListHeight))
            }

            addButton
                .padding(.top, 10)

            if showCloseNudge { closeNudge.padding(.top, 12) }
        }
        .padding(20)
        // La tarjeta se ajusta a lo que tiene dentro. Cuando se estiraba a
        // toda la altura, tres hábitos dejaban media pantalla de blanco y el
        // botón de abajo quedaba desterrado al otro extremo.
        .cardSurface(Radius.card)
        // Mira el día de hoy, no el que estés mirando: cerrar el día es cosa
        // de hoy aunque estés revisando otro.
        .onChange(of: store.congruence(on: todayKey)) { antes, ahora in
            checkDayClosed(from: antes, to: ahora)
        }
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

            reminderButton
                .padding(.trailing, 6)

            if !isCompact {
                layoutToggle
                    .padding(.trailing, 8)
            }

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
            .background(Palette.fill(0.03), in: Capsule())
            .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
        }
    }

    /// La campana del recordatorio: llena si está encendido.
    private var reminderButton: some View {
        Button { editingReminder = true } label: {
            Image(systemName: reminderOn ? "bell.fill" : "bell")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(reminderOn ? Palette.accent : Palette.textMuted)
                .frame(width: 28, height: 26)
                .background(Palette.fill(0.03), in: RoundedRectangle(cornerRadius: Radius.inner))
                .overlay(RoundedRectangle(cornerRadius: Radius.inner).stroke(Palette.hairlineFaint, lineWidth: 1))
                .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .help("Recordatorio de hábitos")
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
                .background(Palette.fill(0.03), in: RoundedRectangle(cornerRadius: Radius.inner))
                .overlay(
                    RoundedRectangle(cornerRadius: Radius.inner).stroke(Palette.hairlineFaint, lineWidth: 1)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .help(layout.label)
    }

    // MARK: - Al cerrar el día

    private var todayKey: String { HabitDay.key(HabitDay.current()) }

    /// El día queda completo al marcar el hábito que faltaba. Es la señal que
    /// la investigación sobre hábitos pide: un momento que ya existe, no una
    /// hora cualquiera. Ahí se ofrece escribir una frase, una vez.
    private func checkDayClosed(from antes: Int, to ahora: Int) {
        if ahora >= 100, antes < 100, celebratedDay != todayKey, isToday, !reduceMotion {
            celebratedDay = todayKey
            celebrate += 1
        }
        guard ahora >= 100, antes < 100,
              nudgedDay != todayKey,
              tasks.notes(on: HabitDay.current()).isEmpty
        else { return }
        nudgedDay = todayKey
        withAnimation(.smooth(duration: 0.35)) { showCloseNudge = true }
    }

    private var closeNudge: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Día completo.")
                .font(.system(size: 14, weight: .semibold, design: .serif))
                .foregroundStyle(Palette.text)
            Text("¿Una frase antes de cerrarlo?")
                .font(.system(size: 13, design: .serif))
                .foregroundStyle(Palette.textMuted)
            HStack(spacing: 14) {
                Button("Escribir") {
                    withAnimation(.smooth(duration: 0.25)) { showCloseNudge = false }
                    #if os(macOS)
                    QuickCapture.shared.toggle()
                    #endif
                }
                .buttonStyle(.pressable)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Palette.accent)
                Button("Ahora no") {
                    withAnimation(.smooth(duration: 0.25)) { showCloseNudge = false }
                }
                .buttonStyle(.pressable)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Palette.textFaint)
                Spacer()
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Radius.row).fill(Palette.positive.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: Radius.row)
            .stroke(Palette.positive.opacity(0.25), lineWidth: 1))
        .transition(.opacity.combined(with: .offset(y: 6)))
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
                    RoundedRectangle(cornerRadius: Radius.row)
                        .strokeBorder(
                            Palette.fill(0.08),
                            style: StrokeStyle(lineWidth: 1, dash: [4, 4])
                        )
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
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
        .buttonStyle(.pressable)
    }
}

/// Cuánto se bajó en un ScrollView (iOS 18 / macOS 15 en adelante; antes no
/// se mueve, y la cabecera chica simplemente no aparece).
private struct ScrollOffsetReader: ViewModifier {
    @Binding var offset: CGFloat

    func body(content: Content) -> some View {
        if #available(iOS 18.0, macOS 15.0, *) {
            content.onScrollGeometryChange(for: CGFloat.self) { g in
                g.contentOffset.y + g.contentInsets.top
            } action: { _, nuevo in
                offset = nuevo
            }
        } else {
            content
        }
    }
}

/// El anillo del inicio del teléfono en cualquier punto entre abierto (p = 0:
/// grande, centrado, el número debajo) y cerrado (p = 1: chico a la
/// izquierda, el número a su derecha con la frase). Todo se interpola, así
/// que se transforma junto con el dedo en vez de saltar.
private struct HomeHero: View {
    let p: CGFloat
    let width: CGFloat
    let percentage: Int
    let level: Int
    let streak: Int
    let celebrate: Int

    /// El tamaño del bloque del número, medido: hace falta para ubicarlo
    /// alrededor del anillo sin pisarlo.
    @State private var bloque: CGSize = .zero

    static let anilloAbierto: CGFloat = 290
    static let anilloCerrado: CGFloat = 124
    static let alturaCerrado: CGFloat = 184
    static func alturaAbierto(conRacha: Bool) -> CGFloat { conRacha ? 478 : 440 }

    private func mezcla(_ a: CGFloat, _ b: CGFloat) -> CGFloat { a + (b - a) * p }
    private var colors: LevelColors { LevelColors.forLevel(level) }
    private var isPaused: Bool { percentage == -1 }

    var body: some View {
        let margen: CGFloat = 26
        let anillo = mezcla(Self.anilloAbierto, Self.anilloCerrado)
        let r = anillo / 2
        // El anillo: del centro, arriba, a la izquierda de la cabecera.
        let cx = mezcla(width / 2, margen + Self.anilloCerrado / 2)
        let cy = mezcla(14 + Self.anilloAbierto / 2, margen + Self.anilloCerrado / 2)

        // El número orbita el anillo por fuera: empieza debajo (centrado) y
        // termina a su derecha, arriba. Nunca lo cruza.
        let rC = Self.anilloCerrado / 2
        let finX: CGFloat = rC + 22, finY: CGFloat = -rC + 2
        let anguloFin = atan2(finY, finX)
        let angulo = .pi / 2 + (anguloFin - .pi / 2) * p
        let distancia = mezcla(r + 24, hypot(finX, finY))
        let px = cx + cos(angulo) * distancia
        let py = cy + sin(angulo) * distancia
        // Qué punto del bloque cae ahí: arriba al centro al principio,
        // arriba a la izquierda al final.
        let ancla = 0.5 * (1 - p)
        let numero = mezcla(58, 50)

        ZStack(alignment: .topLeading) {
            CongruenceRing(percentage: percentage, size: anillo, level: level, celebrate: celebrate)
                .opacity(isPaused ? 0.35 : 1)
                .position(x: cx, y: cy)

            VStack(alignment: p < 0.5 ? .center : .leading, spacing: 8) {
                Text(isPaused ? "—" : "\(max(percentage, 0))%")
                    .font(.system(size: numero, weight: .bold))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .foregroundStyle(isPaused ? Palette.textMuted : colors.primary)
                Text(isPaused ? "En pausa" : "Estabilidad")
                    .microLabelStyle(isPaused ? Palette.textFaint : colors.primary, size: 11)
            }
            .fixedSize()
            .onGeometryChange(for: CGSize.self) { $0.size } action: { bloque = $0 }
            .offset(x: px - bloque.width * ancla, y: py)

            // La frase, sólo cerrada: debajo del número, a la derecha del anillo.
            Text("“La consistencia no es perfección. Es simplemente no rendirse nunca.”")
                .font(.system(size: 12, weight: .light, design: .serif))
                .italic()
                .foregroundStyle(Palette.textFaint)
                .frame(width: max(0, width - (cx + rC + 22) - margen), alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
                .offset(x: px, y: py + bloque.height + 8)
                .opacity(Double(max(0, (p - 0.65) / 0.35)))

            // La racha, sólo abierta.
            if streak > 0 {
                HStack(spacing: 6) {
                    Text("Racha").microLabelStyle(Palette.textFaint, size: 9)
                    Text("\(streak)")
                        .font(.system(size: 11, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.textMuted)
                    Text(streak == 1 ? "día" : "días").microLabelStyle(Palette.textFaint, size: 9)
                }
                .fixedSize()
                .position(x: width / 2, y: py + bloque.height + 34)
                .opacity(Double(max(0, 1 - p * 3)))
            }
        }
        .frame(width: width, alignment: .topLeading)
    }
}

// MARK: - Propuestas para el inicio del iPhone (a elegir)

extension TodayView {
    private static let dayTitle: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es")
        f.dateFormat = "EEEE, d 'de' MMMM"
        return f
    }()

    /// "Sábado, 31 de octubre" chico y "Hoy" grande, como Tareas y Finanzas.
    private var phoneTitle: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(Self.dayTitle.string(from: selectedDate).sentenceCased)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            Text(isToday ? "Hoy" : "Ese día")
                .font(.system(size: 34, weight: .black))
                .tracking(-1)
                .foregroundStyle(Palette.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var doneToday: Int {
        store.habits.filter { $0.log(on: dayKey)?.completed == true }.count
    }

    private var pendingPriority: Int { tasks.pending(onlyPriority: true).count }

    private func chip(_ symbol: String, _ text: String, _ color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: symbol)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(color)
            Text(text)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Palette.text)
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
        .background(Capsule().fill(Palette.panel))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }

    /// Lo del día en una fila: la racha, lo que va y lo que falta.
    private var contextChips: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                chip("flame.fill", streak == 1 ? "1 día" : "\(streak) días", .orange)
                chip("checkmark.circle.fill", "\(doneToday) de \(store.habits.count) hábitos", Palette.accent)
                if pendingPriority > 0 {
                    chip("bolt.fill", pendingPriority == 1 ? "1 prioritaria" : "\(pendingPriority) prioritarias",
                         Color(hex: "#dc2626"))
                }
            }
            .padding(.vertical, 6)
        }
        .scrollIndicators(.hidden)
        .scrollClipDisabled()
    }

    /// Una frase hecha con tus datos de hoy, no una cita genérica.
    private var coachLine: String {
        let faltan = store.habits.count - doneToday
        if store.habits.isEmpty { return "Crea tu primer hábito con el +. Empieza por uno solo." }
        if faltan == 0 {
            return streak > 1 ? "Día completo. Ya son \(streak) días seguidos: así se construye." : "Día completo. Mañana, lo mismo."
        }
        let cerca = store.habits.first { h in
            guard let t = h.weeklyTarget else { return false }
            let n = store.weekCount(for: h)
            return n < t && t - n == 1
        }
        if let cerca, let t = cerca.weeklyTarget {
            return "Llevas \(t - 1) de \(t) en \(cerca.title.capitalized). Uno más y cierras la semana."
        }
        return faltan == 1 ? "Te falta un hábito para cerrar el día." : "Te faltan \(faltan) hábitos para cerrar el día. Empieza por el más fácil."
    }

    private var coachCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Para ti")
                .microLabelStyle(Palette.textFaint, size: 10)
            Text(coachLine)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Palette.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 22).fill(Palette.panel))
        .shadow(color: .black.opacity(0.05), radius: 12, y: 3)
    }

    /// Los hábitos en una sola tarjeta, sin cajas adentro.
    private var phoneHabits: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Hábitos")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Palette.text)
                Spacer()
                reminderButton
            }
            VStack(spacing: 10) {
                ForEach(Array(store.habits.enumerated()), id: \.element.id) { i, habit in
                    HabitRow(
                        habit: habit, day: dayKey,
                        weekDots: store.weekDots(for: habit),
                        weekCount: store.weekCount(for: habit),
                        onToggle: { toggle(habit) },
                        onSetValue: { store.setValue($0, for: habit.id, on: dayKey) },
                        onSkip: { store.markSkip(habit.id, on: dayKey, status: $0) },
                        onEdit: { editingHabit = habit },
                        onMove: { o in withAnimation(.smooth(duration: 0.3)) { store.move(habit.id, by: o) } },
                        onDelete: { deletingHabit = habit },
                        plain: true
                    )
                    .staggeredAppear(i)
                }
            }
        }
    }

    private func phoneScroll<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) { content() }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 120)
        }
        .background(alignment: .top) { atmosphere }
    }

    /// Un cielo suave arriba, del color de tu nivel: la pantalla respira en
    /// vez de ser un gris plano.
    private var atmosphere: some View {
        let c = LevelColors.forLevel(level).primary
        return ZStack {
            Circle().fill(c.opacity(0.22)).frame(width: 360).blur(radius: 90).offset(x: -120, y: -60)
            Circle().fill(Color(hex: "#f5c46b").opacity(0.20)).frame(width: 320).blur(radius: 90).offset(x: 150, y: -20)
            Circle().fill(Color(hex: "#8fb6ff").opacity(0.14)).frame(width: 280).blur(radius: 80).offset(x: 40, y: 140)
        }
        .frame(height: 420)
        .frame(maxWidth: .infinity)
        .ignoresSafeArea(edges: .top)
        .allowsHitTesting(false)
    }

    /// La semana en una fila: cada día con su anillo, el elegido resaltado.
    /// Tocar un día lo abre.
    private var weekStrip: some View {
        let hoy = HabitDay.current()
        let letras = DateFormatter.es("EEEEE")
        let num = DateFormatter.es("d")
        return HStack(spacing: 6) {
            ForEach((0..<7).reversed(), id: \.self) { atras in
                let dia = HabitDay.adding(-atras, to: hoy)
                let key = HabitDay.key(dia)
                let pct = store.congruence(on: key)
                let elegido = key == dayKey
                let color = LevelColors.forLevel(level).primary
                Button { withAnimation(.smooth(duration: 0.25)) { selectedDate = dia } } label: {
                    VStack(spacing: 6) {
                        Text(letras.string(from: dia).uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Palette.textFaint)
                        Text(num.string(from: dia))
                            .font(.system(size: 16, weight: .bold)).monospacedDigit()
                            .foregroundStyle(elegido ? color : Palette.text)
                        ZStack {
                            Circle().stroke(color.opacity(0.15), lineWidth: 3.5)
                            Circle().trim(from: 0, to: CGFloat(max(pct, 0)) / 100)
                                .stroke(color, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                            if pct >= 100 {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 10, weight: .heavy))
                                    .foregroundStyle(color)
                            }
                        }
                        .frame(width: 26, height: 26)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background {
                        if elegido {
                            RoundedRectangle(cornerRadius: 18).fill(Palette.panel)
                                .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
                        }
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
            }
        }
    }

    /// A: tu anillo grande, con encabezado, el día en chips y una frase tuya.
    var homeVariantA: some View {
        phoneScroll {
            phoneTitle
            weekStrip
            contextChips
            VStack(spacing: 6) {
                CongruenceRing(percentage: congruence, size: 230, level: level, celebrate: celebrate)
                Text("\(max(congruence, 0))%")
                    .font(.system(size: 46, weight: .bold)).monospacedDigit()
                    .foregroundStyle(LevelColors.forLevel(level).primary)
                Text("Estabilidad").microLabelStyle(LevelColors.forLevel(level).primary, size: 11)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            coachCard
            phoneHabits
        }
    }

    private func miniRing(_ value: Double, _ text: String, _ label: String, _ color: Color) -> some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().stroke(color.opacity(0.15), lineWidth: 9)
                Circle().trim(from: 0, to: max(0.001, min(value, 1)))
                    .stroke(color, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text(text)
                    .font(.system(size: 20, weight: .bold)).monospacedDigit()
                    .minimumScaleFactor(0.6).lineLimit(1)
                    .foregroundStyle(Palette.text)
                    .padding(.horizontal, 10)
            }
            .frame(width: 88, height: 88)
            Text(label)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.textMuted)
        }
        .frame(maxWidth: .infinity)
    }

    /// B: a la manera de Bevel. Tres anillos chicos, uno por parte de tu vida.
    var homeVariantB: some View {
        let hechas = tasks.completedToday()
        let tareas = Double(hechas) / Double(max(1, hechas + tasks.pending(onlyPriority: true).count))
        let plata = FinanceEngine.allowance(doc: finance.document)
        let libre = plata.map { $0.today <= 0 ? 0 : $0.today / max(1, $0.today + $0.spentToday) } ?? 0
        return phoneScroll {
            phoneTitle
            weekStrip
            HStack(spacing: 0) {
                miniRing(Double(max(congruence, 0)) / 100, "\(max(congruence, 0))%", "Hábitos",
                         LevelColors.forLevel(level).primary)
                Rectangle().fill(Palette.hairlineFaint).frame(width: 1, height: 110)
                miniRing(tareas, "\(hechas)/\(hechas + tasks.pending(onlyPriority: true).count)", "Prioritarias",
                         Color(hex: "#dc2626"))
                Rectangle().fill(Palette.hairlineFaint).frame(width: 1, height: 110)
                miniRing(libre, plata.map { Money.format(max(0, $0.today), doc: finance.document) } ?? "—",
                         "Para gastar", FinPalette.income)
            }
            .padding(.vertical, 18)
            .background(RoundedRectangle(cornerRadius: 22).fill(Palette.panel))
            .shadow(color: .black.opacity(0.05), radius: 12, y: 3)
            coachCard
            phoneHabits
        }
    }

    /// C: el anillo con el número adentro, y al lado los datos del día.
    var homeVariantC: some View {
        let colors = LevelColors.forLevel(level)
        return phoneScroll {
            phoneTitle
            weekStrip
            HStack(spacing: 18) {
                ZStack {
                    CongruenceRing(percentage: congruence, size: 170, level: level, celebrate: celebrate)
                    VStack(spacing: 0) {
                        Text("\(max(congruence, 0))%")
                            .font(.system(size: 34, weight: .bold)).monospacedDigit()
                            .foregroundStyle(colors.primary)
                        Text("Estabilidad").microLabelStyle(colors.primary, size: 8)
                    }
                }
                VStack(alignment: .leading, spacing: 14) {
                    stat("\(streak)", streak == 1 ? "día de racha" : "días de racha")
                    stat("\(doneToday)/\(store.habits.count)", "hábitos hoy")
                    if pendingPriority > 0 { stat("\(pendingPriority)", pendingPriority == 1 ? "prioritaria" : "prioritarias") }
                }
                Spacer(minLength: 0)
            }
            .padding(18)
            .background(RoundedRectangle(cornerRadius: 22).fill(Palette.panel))
            .shadow(color: .black.opacity(0.05), radius: 12, y: 3)
            coachCard
            phoneHabits
        }
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.system(size: 24, weight: .bold)).monospacedDigit().foregroundStyle(Palette.text)
            Text(label).font(.system(size: 13)).foregroundStyle(Palette.textMuted)
        }
    }
}

// MARK: - Seis propuestas más, con el anillo de protagonista

extension TodayView {
    private var pct: Int { max(congruence, 0) }
    private var tone: Color { LevelColors.forLevel(level).primary }

    /// El número dentro del anillo, a la medida del hueco: el aro de adentro
    /// deja libre un 38 % del ancho, y el texto no puede tocarlo.
    private func pctLabel(_ ring: CGFloat) -> some View {
        VStack(spacing: 1) {
            Text("\(pct)%")
                .font(.system(size: ring * 0.15, weight: .bold)).monospacedDigit()
                .contentTransition(.numericText())
            Text("Estabilidad").microLabelStyle(tone, size: max(7, ring * 0.028))
        }
        .foregroundStyle(tone)
        .frame(width: ring * 0.34)
        .minimumScaleFactor(0.5)
    }

    private var miniStats: some View {
        HStack(spacing: 22) {
            miniStat("\(streak)", streak == 1 ? "día" : "días")
            miniStat("\(doneToday)/\(store.habits.count)", "hoy")
            if pendingPriority > 0 { miniStat("\(pendingPriority)", "prioritaria") }
        }
    }

    private func miniStat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 0) {
            Text(v).font(.system(size: 20, weight: .bold)).monospacedDigit()
            Text(l).font(.system(size: 12)).opacity(0.6)
        }
    }

    /// D: el anillo en un escenario oscuro, brillando. Como una joya en su caja.
    var homeVariantD: some View {
        phoneScroll {
            phoneTitle
            ZStack {
                RoundedRectangle(cornerRadius: 30)
                    .fill(LinearGradient(colors: [Color(hex: "#0f2a26"), Color(hex: "#050807")],
                                         startPoint: .top, endPoint: .bottom))
                Circle().fill(tone.opacity(0.45)).frame(width: 240).blur(radius: 80).offset(y: -40)
                VStack(spacing: 18) {
                    ZStack {
                        CongruenceRing(percentage: congruence, size: 250, level: level, celebrate: celebrate)
                        pctLabel(250)
                    }
                    miniStats.foregroundStyle(.white)
                }
                .padding(.vertical, 28)
            }
            .environment(\.colorScheme, .dark)
            .shadow(color: tone.opacity(0.25), radius: 24, y: 10)
            weekStrip
            coachCard
            phoneHabits
        }
    }

    /// E: el anillo enorme al centro con el número adentro, y la frase debajo.
    var homeVariantE: some View {
        phoneScroll {
            phoneTitle
            weekStrip
            VStack(spacing: 16) {
                ZStack {
                    Circle().fill(tone.opacity(0.18)).frame(width: 220).blur(radius: 60)
                    CongruenceRing(percentage: congruence, size: 310, level: level, celebrate: celebrate)
                    pctLabel(310)
                }
                Text("“La consistencia no es perfección. Es simplemente no rendirse nunca.”")
                    .font(.system(size: 15, weight: .light, design: .serif)).italic()
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 24)
                miniStats.foregroundStyle(Palette.text)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            phoneHabits
        }
    }

    /// Cuánto lleva un hábito hoy, de 0 a 1.
    private func progress(of h: Habit) -> Double {
        if h.type == .numeric, h.goal > 0 { return min(1, (h.log(on: dayKey)?.value ?? 0) / h.goal) }
        if let t = h.weeklyTarget, t > 0 { return min(1, Double(store.weekCount(for: h)) / Double(t)) }
        return h.log(on: dayKey)?.completed == true ? 1 : 0
    }

    /// F: cada aro es uno de tus hábitos, con su color. El anillo deja de ser
    /// decorado y pasa a decir algo.
    var homeVariantF: some View {
        let habits = Array(store.habits.prefix(5))
        let size: CGFloat = 270
        let grosor: CGFloat = 20
        return phoneScroll {
            phoneTitle
            weekStrip
            VStack(spacing: 16) {
                ZStack {
                    ForEach(Array(habits.enumerated()), id: \.element.id) { i, h in
                        let d = size - CGFloat(i) * (grosor + 6) * 2
                        let c = Color.tint(h.color)
                        Circle().stroke(c.opacity(0.15), lineWidth: grosor).frame(width: d, height: d)
                        Circle().trim(from: 0, to: max(0.001, progress(of: h)))
                            .stroke(c, style: StrokeStyle(lineWidth: grosor, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                            .frame(width: d, height: d)
                            .shadow(color: c.opacity(0.4), radius: 6)
                    }
                    Text("\(pct)%")
                        .font(.system(size: 30, weight: .bold)).monospacedDigit()
                        .foregroundStyle(Palette.text)
                }
                .frame(width: size + grosor, height: size + grosor)
                .animation(.spring(response: 0.7, dampingFraction: 0.7), value: dayKey)
                HStack(spacing: 14) {
                    ForEach(habits) { h in
                        HStack(spacing: 5) {
                            Circle().fill(Color.tint(h.color)).frame(width: 8, height: 8)
                            Text(h.title.unshouted).font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Palette.textMuted).lineLimit(1)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            coachCard
            phoneHabits
        }
    }

    /// G: un dial con marcas, como un instrumento. El número grande en el centro.
    var homeVariantG: some View {
        phoneScroll {
            phoneTitle
            ZStack {
                Canvas { ctx, sz in
                    let c = CGPoint(x: sz.width / 2, y: sz.height / 2)
                    let r = min(sz.width, sz.height) / 2 - 6
                    let n = 90
                    for i in 0..<n {
                        let f = Double(i) / Double(n - 1)
                        let a = Angle.degrees(135 + 270 * f).radians
                        let on = f <= Double(pct) / 100 && pct > 0
                        let largo: CGFloat = i % 10 == 0 ? 22 : 14
                        var path = Path()
                        path.move(to: CGPoint(x: c.x + cos(a) * r, y: c.y + sin(a) * r))
                        path.addLine(to: CGPoint(x: c.x + cos(a) * (r - largo), y: c.y + sin(a) * (r - largo)))
                        ctx.stroke(path, with: .color(on ? tone : Palette.textFaint.opacity(0.35)),
                                   style: StrokeStyle(lineWidth: on ? 3.5 : 2, lineCap: .round))
                    }
                }
                .frame(width: 330, height: 330)
                CongruenceRing(percentage: congruence, size: 200, level: level, celebrate: celebrate)
                pctLabel(200)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 4)
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity).padding(.top, -24)
            weekStrip
            phoneHabits
        }
    }

    /// H: el anillo rodeado de un halo de 30 marcas, una por cada uno de tus
    /// últimos 30 días, del color de cómo te fue.
    var homeVariantH: some View {
        let hoy = HabitDay.current()
        let dias = (0..<30).reversed().map { store.congruence(on: HabitDay.key(HabitDay.adding(-$0, to: hoy))) }
        return phoneScroll {
            phoneTitle
            ZStack {
                Circle().fill(tone.opacity(0.16)).frame(width: 240).blur(radius: 60)
                ForEach(Array(dias.enumerated()), id: \.offset) { i, v in
                    Capsule()
                        .fill(v <= 0 ? Palette.textFaint.opacity(0.25) : tone.opacity(0.35 + 0.65 * Double(v) / 100))
                        .frame(width: 6, height: v >= 100 ? 26 : 18)
                        .offset(y: -158)
                        .rotationEffect(.degrees(Double(i) / 30 * 360))
                }
                CongruenceRing(percentage: congruence, size: 250, level: level, celebrate: celebrate)
                pctLabel(250)
            }
            .frame(width: 350, height: 350)
            .frame(maxWidth: .infinity)
            Text("El halo son tus últimos 30 días")
                .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                .frame(maxWidth: .infinity)
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity)
            coachCard
            phoneHabits
        }
    }

    /// I: editorial. El número enorme a la izquierda y el anillo gigante
    /// saliéndose por el borde, como en la tapa de una revista.
    var homeVariantI: some View {
        phoneScroll {
            phoneTitle
            ZStack(alignment: .leading) {
                CongruenceRing(percentage: congruence, size: 380, level: level, celebrate: celebrate)
                    .offset(x: 150)
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(pct)%")
                        .font(.system(size: 96, weight: .black)).monospacedDigit()
                        .tracking(-4)
                        .foregroundStyle(tone)
                    Text("Estabilidad").microLabelStyle(tone, size: 11)
                    Text("La consistencia no es perfección. Es no rendirse nunca.")
                        .font(.system(size: 15, weight: .light, design: .serif)).italic()
                        .foregroundStyle(Palette.textMuted)
                        .frame(width: 170, alignment: .leading)
                        .padding(.top, 8)
                    miniStats.foregroundStyle(Palette.text).padding(.top, 12)
                }
            }
            .frame(height: 380)
            .frame(maxWidth: .infinity, alignment: .leading)
            weekStrip
            phoneHabits
        }
    }
}

// MARK: - Variaciones de E (el anillo gigante y limpio)

extension TodayView {
    private var quote: String { "“La consistencia no es perfección. Es simplemente no rendirse nunca.”" }

    private func bigRing(_ size: CGFloat, glow: Double = 0.18) -> some View {
        ZStack {
            Circle().fill(tone.opacity(glow)).frame(width: size * 0.72).blur(radius: 60)
            CongruenceRing(percentage: congruence, size: size, level: level, celebrate: celebrate)
            pctLabel(size)
        }
    }

    private var quoteText: some View {
        Text(quote)
            .font(.system(size: 15, weight: .light, design: .serif)).italic()
            .multilineTextAlignment(.center)
            .foregroundStyle(Palette.textMuted)
            .padding(.horizontal, 24)
    }

    /// E1: todo centrado. La fecha chica arriba, el anillo todavía más grande.
    var variantE1: some View {
        phoneScroll {
            VStack(spacing: 4) {
                Text(Self.dayTitle.string(from: selectedDate).sentenceCased)
                    .font(.system(size: 15, weight: .medium)).foregroundStyle(Palette.textMuted)
                Text("Hoy").font(.system(size: 22, weight: .bold)).foregroundStyle(Palette.text)
            }
            .frame(maxWidth: .infinity)
            bigRing(345)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            quoteText
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity)
            weekStrip
            phoneHabits
        }
    }

    /// E2: igual que E, de noche. Congruence nació oscura.
    var variantE2: some View {
        homeVariantE
            .background(Color(hex: "#0a0a0a").ignoresSafeArea())
            .environment(\.colorScheme, .dark)
    }

    /// E3: E con tus últimos 30 días alrededor, en puntos finos.
    var variantE3: some View {
        let hoy = HabitDay.current()
        let dias = (0..<30).reversed().map { store.congruence(on: HabitDay.key(HabitDay.adding(-$0, to: hoy))) }
        return phoneScroll {
            phoneTitle
            weekStrip
            ZStack {
                ForEach(Array(dias.enumerated()), id: \.offset) { i, v in
                    Circle()
                        .fill(v <= 0 ? Palette.textFaint.opacity(0.25) : tone.opacity(0.4 + 0.6 * Double(v) / 100))
                        .frame(width: v >= 100 ? 8 : 5, height: v >= 100 ? 8 : 5)
                        .offset(y: -168)
                        .rotationEffect(.degrees(Double(i) / 30 * 360))
                }
                bigRing(300)
            }
            .frame(width: 350, height: 350)
            .frame(maxWidth: .infinity)
            quoteText
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity)
            phoneHabits
        }
    }

    private func glassChip(_ v: String, _ l: String) -> some View {
        VStack(spacing: 0) {
            Text(v).font(.system(size: 18, weight: .bold)).monospacedDigit().foregroundStyle(Palette.text)
            Text(l).font(.system(size: 11)).foregroundStyle(Palette.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(RoundedRectangle(cornerRadius: 18).fill(Palette.panel.opacity(0.7)))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }

    /// E4: la frase arriba como titular, el anillo, y los datos en fichas.
    var variantE4: some View {
        phoneScroll {
            phoneTitle
            weekStrip
            Text(quote)
                .font(.system(size: 19, weight: .light, design: .serif)).italic()
                .foregroundStyle(Palette.text)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 12)
            bigRing(310).frame(maxWidth: .infinity)
            HStack(spacing: 10) {
                glassChip("\(streak)", streak == 1 ? "día de racha" : "días de racha")
                glassChip("\(doneToday)/\(store.habits.count)", "hábitos hoy")
                glassChip("\(pendingPriority)", "prioritarias")
            }
            phoneHabits
        }
    }

    /// E5: la semana justo debajo del anillo, como su raíz: hoy arriba, en
    /// grande, y los días que lo trajeron hasta acá debajo.
    var variantE5: some View {
        phoneScroll {
            phoneTitle
            bigRing(320).frame(maxWidth: .infinity).padding(.top, 4)
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity)
            weekStrip
                .padding(.horizontal, 6)
                .background(RoundedRectangle(cornerRadius: 24).fill(Palette.panel.opacity(0.55)))
            quoteText
            phoneHabits
        }
    }

    /// E6: el anillo sobre un disco de vidrio esmerilado, flotando en un
    /// cielo más intenso.
    var variantE6: some View {
        phoneScroll {
            phoneTitle
            weekStrip
            ZStack {
                Circle().fill(tone.opacity(0.35)).frame(width: 300).blur(radius: 70).offset(x: -40, y: -30)
                Circle().fill(Color(hex: "#f5c46b").opacity(0.35)).frame(width: 220).blur(radius: 70).offset(x: 80, y: 60)
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 330, height: 330)
                    .overlay(Circle().stroke(.white.opacity(0.7), lineWidth: 1))
                    .shadow(color: .black.opacity(0.08), radius: 24, y: 10)
                CongruenceRing(percentage: congruence, size: 290, level: level, celebrate: celebrate)
                pctLabel(290)
            }
            .frame(height: 360)
            .frame(maxWidth: .infinity)
            quoteText
            miniStats.foregroundStyle(Palette.text).frame(maxWidth: .infinity)
            phoneHabits
        }
    }
}

// MARK: - E2 y E3 con los hábitos a la vista

extension TodayView {
    /// La fecha ya está en la semana; arriba basta "Hoy" y cómo vas.
    private var compactHeader: some View {
        HStack(alignment: .center, spacing: 8) {
            Text(isToday ? "Hoy" : "Ese día")
                .font(.system(size: 34, weight: .black)).tracking(-1)
                .foregroundStyle(Palette.text)
            Spacer()
            if streak > 0 { chip("flame.fill", streak == 1 ? "1 día" : "\(streak) días", .orange) }
            chip("checkmark.circle.fill", "\(doneToday)/\(store.habits.count)", tone)
        }
    }

    /// El anillo con tus últimos 30 días alrededor, en puntos.
    private func haloRing(_ size: CGFloat) -> some View {
        let hoy = HabitDay.current()
        let dias = (0..<30).reversed().map { store.congruence(on: HabitDay.key(HabitDay.adding(-$0, to: hoy))) }
        let radio = size * 0.58
        return ZStack {
            ForEach(Array(dias.enumerated()), id: \.offset) { i, v in
                Circle()
                    .fill(v <= 0 ? Palette.textFaint.opacity(0.3) : tone.opacity(0.4 + 0.6 * Double(v) / 100))
                    .frame(width: v >= 100 ? 7 : 4.5, height: v >= 100 ? 7 : 4.5)
                    .offset(y: -radio)
                    .rotationEffect(.degrees(Double(i) / 30 * 360))
            }
            bigRing(size)
        }
        .frame(width: radio * 2 + 10, height: radio * 2 + 10)
    }

    private var habitCards: some View {
        VStack(spacing: 10) {
            ForEach(Array(store.habits.enumerated()), id: \.element.id) { i, habit in
                HabitRow(
                    habit: habit, day: dayKey,
                    weekDots: store.weekDots(for: habit),
                    weekCount: store.weekCount(for: habit),
                    onToggle: { toggle(habit) },
                    onSetValue: { store.setValue($0, for: habit.id, on: dayKey) },
                    onSkip: { store.markSkip(habit.id, on: dayKey, status: $0) },
                    onEdit: { editingHabit = habit },
                    onMove: { o in withAnimation(.smooth(duration: 0.3)) { store.move(habit.id, by: o) } },
                    onDelete: { deletingHabit = habit },
                    plain: true
                )
                .staggeredAppear(i)
            }
        }
    }

    /// Lo mismo que E2/E3, apretado para que los hábitos entren en la
    /// primera pantalla: la frase y la campana bajan, después de los hábitos.
    func compactHome(dark: Bool) -> some View {
        ScrollView {
            VStack(spacing: 14) {
                compactHeader
                weekStrip
                haloRing(250)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, -6)
                habitCards
                quoteText.padding(.top, 10)
                HStack {
                    Spacer()
                    reminderButton
                    Spacer()
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 120)
        }
        .background(alignment: .top) { atmosphere }
        .background(dark ? Color(hex: "#0a0a0a").ignoresSafeArea() : nil)
        .environment(\.colorScheme, dark ? .dark : .light)
    }
}
