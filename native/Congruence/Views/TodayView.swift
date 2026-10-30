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
                        phoneHome
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
