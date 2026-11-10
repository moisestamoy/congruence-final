import SwiftUI

/// Los Pilares: dónde estás y a dónde vas en las cinco partes de tu vida.
/// Se entra tocando el anillo; no tiene lugar propio en la barra.
///
/// Mismo orden que el día: a la izquierda el pentágono con tu promedio, como
/// el anillo en Hábitos; a la derecha la lista de pilares para marcar, el
/// cierre de la noche, el tema de la semana y la revisión.
struct PillarsView: View {
    let onClose: () -> Void

    @Environment(PillarStore.self) private var pillars
    @Environment(HabitStore.self) private var habits
    @Environment(\.isCompact) private var isCompact

    @State private var openId: PillarId?
    @State private var reviewing = false

    /// El día de los pilares es el de los hábitos: cambia a las 5 AM.
    private var day: String { HabitDay.key(HabitDay.current()) }

    var body: some View {
        GeometryReader { geo in
            let wide = !isCompact && geo.size.width >= 860
            ScrollViewReader { proxy in
                Group {
                    if wide {
                        HStack(alignment: .top, spacing: 32) {
                            VStack(alignment: .leading, spacing: 0) {
                                header
                                Spacer(minLength: 0)
                                hero(proxy)
                                Spacer(minLength: 0)
                            }
                            .frame(width: min(460, geo.size.width * 0.4))
                            .frame(maxHeight: .infinity)

                            ScrollView {
                                panels.padding(.vertical, 24)
                            }
                            .scrollIndicators(.hidden)
                        }
                        .padding(.horizontal, 28)
                    } else {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 18) {
                                header
                                hero(proxy)
                                panels
                            }
                            .padding(.horizontal, 18)
                            .padding(.top, 8)
                            .padding(.bottom, 120)
                        }
                    }
                }
            }
        }
        .onEscape(onClose)
        .sheet(isPresented: $reviewing) { WeeklyReviewSheet(day: day) }
    }

    // MARK: - Cabecera y pentágono

    private var header: some View {
        HStack(spacing: 12) {
            Button(action: onClose) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.textMuted)
                    .frame(width: 32, height: 30)
                    .background(Palette.fill(0.04), in: RoundedRectangle(cornerRadius: Radius.control))
                    .overlay(RoundedRectangle(cornerRadius: Radius.control).stroke(Palette.hairlineFaint, lineWidth: 1))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
            .help("Volver a Hábitos (Esc)")
            .accessibilityLabel("Volver a Hábitos")

            Text("Pilares")
                .font(.system(size: 30, weight: .black))
                .tracking(-0.8)
                .foregroundStyle(Palette.text)
            Spacer()
        }
        .padding(.top, isCompact ? 4 : 24)
    }

    private func hero(_ proxy: ScrollViewProxy) -> some View {
        let lejos = pillars.furthest
        return VStack(spacing: 0) {
            PentagonRadar(scoresA: PillarId.allCases.map { pillars.pillar($0).scoreA },
                          scoresB: PillarId.allCases.map { pillars.pillar($0).scoreB }) { id in
                open(id, proxy)
            }
            .frame(maxWidth: 420)

            Text(String(format: "%.1f", pillars.average))
                .font(.system(size: isCompact ? 56 : 72, weight: .heavy))
                .monospacedDigit()
                .contentTransition(.numericText())
                .foregroundStyle(Palette.accent)
                .animation(.smooth(duration: 0.4), value: pillars.average)
            Text("Equilibrio")
                .microLabelStyle(Palette.accent, size: 11)
                .padding(.top, 2)

            Group {
                if lejos.gap > 0 {
                    Button { open(lejos.id, proxy) } label: {
                        (Text("Lo más lejos de tu meta: ").foregroundStyle(Palette.textFaint)
                         + Text(lejos.id.label).foregroundStyle(Palette.text).fontWeight(.semibold)
                         + Text(lejos.gap == 1 ? ", a 1 punto." : ", a \(lejos.gap) puntos.").foregroundStyle(Palette.textFaint))
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.pressable)
                } else {
                    Text("Todo en su meta. Toca subir alguna.")
                        .font(.system(size: 12))
                        .foregroundStyle(Palette.textFaint)
                }
            }
            .padding(.top, 14)
        }
        .frame(maxWidth: .infinity)
    }

    private func open(_ id: PillarId, _ proxy: ScrollViewProxy) {
        withAnimation(.smooth(duration: 0.3)) {
            openId = id
            proxy.scrollTo(id, anchor: .top)
        }
    }

    // MARK: - Columna de trabajo

    private var panels: some View {
        VStack(alignment: .leading, spacing: 16) {
            todayPanel
            NightClosePanel(day: day)
            WeeklyThemePanel(start: pillars.document.themeStartDate)
            reviewPanel
        }
    }

    private var todayPanel: some View {
        let foco = pillars.inFocus
        let hechos = foco.filter { pillars.isDone($0, on: day, habits: habits) }.count

        return VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                Circle().fill(Palette.accent).frame(width: 5, height: 5).padding(.trailing, 8)
                Text("Hoy")
                    .font(.system(size: 15, weight: .bold))
                    .tracking(1.8)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.text)
                Spacer()
                Text("\(DateFormatter.es("d MMM").string(from: HabitDay.current())) · \(hechos)/\(foco.count)")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(hechos == foco.count ? Palette.accent : Palette.textMuted)
                    .contentTransition(.numericText())
                    .animation(.smooth(duration: 0.3), value: hechos)
            }
            .padding(.bottom, 16)

            VStack(spacing: 8) {
                ForEach(Array(PillarId.allCases.enumerated()), id: \.element) { i, id in
                    PillarRow(id: id, day: day, isOpen: openId == id) {
                        withAnimation(.smooth(duration: 0.28)) { openId = openId == id ? nil : id }
                    }
                    .id(id)
                    .staggeredAppear(i)
                }
            }
        }
        .padding(20)
        .cardSurface(Radius.card)
    }

    private var reviewPanel: some View {
        let esDomingo = Calendar.current.component(.weekday, from: HabitDay.current()) == 1
        let ultima = pillars.document.reviews.last
        return HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 5) {
                Text(esDomingo ? "Hoy toca revisar la semana" : "Revisión de la semana")
                    .font(.system(size: 13, weight: .bold))
                    .tracking(1.4)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.text)
                Text((ultima.map { "Última: \(DateFormatter.es("d 'de' MMMM").string(from: FinDate.date($0.date))). " } ?? "Aún no hay ninguna. ")
                     + "Tus puntajes pasan a ser tu punto de partida.")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            Button { reviewing = true } label: {
                Text("Revisar")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.2)
                    .textCase(.uppercase)
                    .foregroundStyle(esDomingo ? Palette.onAccent : Palette.text)
                    .padding(.horizontal, 16)
                    .frame(height: 34)
                    .background(esDomingo ? Palette.accent : Palette.fill(0.06), in: RoundedRectangle(cornerRadius: Radius.control))
                    .overlay(RoundedRectangle(cornerRadius: Radius.control)
                        .stroke(esDomingo ? .clear : Palette.hairline, lineWidth: 1))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
        }
        .padding(20)
        .cardSurface(Radius.card)
        .overlay(RoundedRectangle(cornerRadius: Radius.card)
            .stroke(esDomingo ? Palette.accent.opacity(0.45) : .clear, lineWidth: 1))
    }
}

// MARK: - Una fila por pilar, como los hábitos

private struct PillarRow: View {
    let id: PillarId
    let day: String
    let isOpen: Bool
    let onToggleOpen: () -> Void

    @Environment(PillarStore.self) private var pillars
    @Environment(HabitStore.self) private var habits
    @Environment(\.isCompact) private var isCompact

    private var pillar: Pillar { pillars.pillar(id) }
    private var done: Bool { pillars.isDone(id, on: day, habits: habits) }

    /// Los últimos 7 días, del más viejo a hoy.
    private var week: [Bool] {
        let hoy = HabitDay.current()
        return (0..<7).reversed().map { pillars.isDone(id, on: HabitDay.key(HabitDay.adding(-$0, to: hoy)), habits: habits) }
    }

    /// Cuánto se movió entre las dos últimas revisiones.
    private var delta: Int {
        let r = pillars.document.reviews
        guard r.count >= 2, let a = r[r.count - 1].scores[id.rawValue], let b = r[r.count - 2].scores[id.rawValue] else { return 0 }
        return a - b
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                check.padding(.trailing, 14)

                Button(action: onToggleOpen) {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(id.label)
                                .textCase(.uppercase)
                                .font(.system(size: 12, weight: .bold))
                                .tracking(1.1)
                                .foregroundStyle(done ? Palette.accent : Palette.text)
                            Text(subtitle)
                                .font(.system(size: 11))
                                .foregroundStyle(Palette.textFaint)
                                .lineLimit(1)
                        }
                        Spacer(minLength: 8)

                        HStack(spacing: 5) {
                            ForEach(Array(week.enumerated()), id: \.offset) { _, hecho in
                                Circle()
                                    .fill(hecho ? Palette.accent.opacity(0.85) : Palette.fill(0.10))
                                    .frame(width: 4, height: 4)
                            }
                        }
                        .accessibilityHidden(true)

                        VStack(alignment: .trailing, spacing: 1) {
                            (Text("\(pillar.scoreA)").foregroundStyle(Palette.text)
                             + Text(" → \(pillar.scoreB)").foregroundStyle(Palette.textFaint))
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            if delta != 0 {
                                Text(delta > 0 ? "+\(delta)" : "\(delta)")
                                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                                    .foregroundStyle(delta > 0 ? Palette.positive : Palette.negative)
                            }
                        }
                        .frame(minWidth: 46, alignment: .trailing)

                        Image(systemName: "chevron.down")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Palette.textFaint)
                            .rotationEffect(.degrees(isOpen ? 180 : 0))
                    }
                    .frame(height: 56)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(id.label), \(pillar.scoreA) de \(pillar.scoreB). \(isOpen ? "Cerrar" : "Editar")")
            }
            .padding(.horizontal, 16)
            .opacity(pillar.enFoco ? 1 : 0.5)

            if isOpen {
                editor
                    .padding(.horizontal, 16)
                    .padding(.bottom, 18)
                    .transition(.opacity.combined(with: .offset(y: -6)))
            }
        }
        .background(RoundedRectangle(cornerRadius: Radius.row).fill(Palette.nested))
        .overlay(RoundedRectangle(cornerRadius: Radius.row)
            .stroke(done ? Palette.accent.opacity(0.4) : Palette.hairlineFaint, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: Radius.row))
        .animation(.smooth(duration: 0.3), value: done)
        .sensoryFeedback(.impact(weight: .light), trigger: done)
    }

    private var subtitle: String {
        let minimo = pillar.minimo.trimmingCharacters(in: .whitespacesAndNewlines)
        if !minimo.isEmpty { return minimo }
        return pillar.enFoco ? "Falta tu acción mínima" : "En pausa"
    }

    /// El mismo círculo de los hábitos. Un pilar en pausa no se marca.
    @ViewBuilder
    private var check: some View {
        if pillar.enFoco {
            Button { pillars.toggle(id, on: day, habits: habits) } label: {
                ZStack {
                    Circle()
                        .stroke(done ? Palette.accent : Palette.hairline, lineWidth: 1.5)
                        .frame(width: 20, height: 20)
                    if done {
                        Circle()
                            .fill(Palette.accent)
                            .frame(width: 10, height: 10)
                            .shadow(color: Palette.nightGlow(Palette.accent, 0.6), radius: 6)
                            .transition(.scale(scale: 0.1).combined(with: .opacity)
                                .animation(.spring(response: 0.35, dampingFraction: 0.55)))
                    }
                }
                // Más grande que el dibujo: que se acierte con el dedo.
                .frame(width: 32, height: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(done ? "Desmarcar \(id.label)" : "Marcar \(id.label)")
            .accessibilityAddTraits(done ? .isSelected : [])
            .padding(.horizontal, -6)
        } else {
            Rectangle().fill(Palette.textFaint).frame(width: 9, height: 1.5).frame(width: 20, height: 20)
        }
    }

    // MARK: Editar

    private func bind(_ key: WritableKeyPath<Pillar, String>) -> Binding<String> {
        Binding(get: { pillars.pillar(id)[keyPath: key] },
                set: { nuevo in pillars.update(id) { $0[keyPath: key] = nuevo } })
    }

    private func bind(_ key: WritableKeyPath<Pillar, Int>) -> Binding<Int> {
        Binding(get: { pillars.pillar(id)[keyPath: key] },
                set: { nuevo in pillars.update(id) { $0[keyPath: key] = nuevo } })
    }

    private var editor: some View {
        VStack(alignment: .leading, spacing: 18) {
            Rectangle().fill(Palette.hairlineFaint).frame(height: 1)

            pair {
                field("Dónde estoy", "Cómo está esto hoy, sin adornos", bind(\.puntoA), score: bind(\.scoreA))
            } _: {
                field("A dónde voy", "Cómo se ve cuando lo logre", bind(\.puntoB), score: bind(\.scoreB))
            }
            pair {
                field("Qué me frena", "La barrera de ahora", bind(\.barrera))
            } _: {
                field("Acción mínima", "Lo que hago aunque el día salga mal", bind(\.minimo))
            }
            field("Quién tengo que ser para sostenerlo", "Opcional", bind(\.quienSere))

            if let habit = pillars.linkedHabit(id, in: habits) {
                Text("Su check es el del hábito \(habit.title.unshouted): marcar uno marca el otro.")
                    .font(.system(size: 10))
                    .foregroundStyle(Palette.textFaint)
            }

            Toggle(isOn: Binding(get: { pillar.enFoco }, set: { v in pillars.update(id) { $0.enFoco = v } })) {
                Text(pillar.enFoco ? "En foco: lo marco cada día" : "En pausa: no lo marco por ahora")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textMuted)
            }
            .toggleStyle(.switch)
            .tint(Palette.accent)
            .controlSize(.small)
        }
    }

    /// Dos campos lado a lado en la Mac; uno debajo del otro en el teléfono.
    @ViewBuilder
    private func pair<A: View, B: View>(@ViewBuilder _ a: () -> A, @ViewBuilder _ b: () -> B) -> some View {
        if isCompact {
            VStack(alignment: .leading, spacing: 18) { a(); b() }
        } else {
            HStack(alignment: .top, spacing: 20) { a(); b() }
        }
    }

    private func field(_ label: String, _ placeholder: String, _ text: Binding<String>,
                       score: Binding<Int>? = nil) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            LineField(placeholder: placeholder, text: text)
            if let score { ScoreScale(value: score).padding(.top, 4) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Piezas

/// Campo de una línea que crece, sin caja: se escribe como en un cuaderno.
struct LineField: View {
    let placeholder: String
    @Binding var text: String
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .topLeading) {
                // A mano: en macOS el color del `prompt` se ignora.
                if text.isEmpty {
                    Text(placeholder)
                        .font(.system(size: 13))
                        .foregroundStyle(Palette.textFaint.opacity(0.75))
                        .allowsHitTesting(false)
                }
                TextField("", text: $text, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1...6)
                    .focused($focused)
            }
            Rectangle()
                .fill(focused ? Palette.accent : Palette.hairline)
                .frame(height: 1)
                .animation(.smooth(duration: 0.2), value: focused)
        }
        .accessibilityLabel(placeholder)
    }
}

/// Puntaje de 1 a 10 en diez marcas: se toca la que corresponde.
struct ScoreScale: View {
    @Binding var value: Int

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 4) {
                ForEach(1...10, id: \.self) { n in
                    Button { value = n } label: {
                        Capsule()
                            .fill(n <= value ? Palette.accent : Palette.fill(0.09))
                            .frame(height: 5)
                            .frame(maxWidth: .infinity)
                            .frame(height: 22)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .animation(.smooth(duration: 0.18), value: value)
            Text("\(value)")
                .font(.system(size: 13, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(Palette.text)
                .frame(width: 20, alignment: .trailing)
        }
        .accessibilityElement()
        .accessibilityLabel("Puntaje")
        .accessibilityValue("\(value) de 10")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: value = min(10, value + 1)
            case .decrement: value = max(1, value - 1)
            @unknown default: break
            }
        }
    }
}

// MARK: - Cierre del día

private struct NightClosePanel: View {
    let day: String

    @Environment(PillarStore.self) private var pillars
    /// Es para la noche: antes de las 18 h queda plegado.
    @State private var isOpen: Bool = {
        let h = Calendar.current.component(.hour, from: Date())
        return h >= 18 || h < 5
    }()

    private static let preguntas: [(WritableKeyPath<DailyClose, String>, String)] = [
        (\.hizo, "¿Qué hice hoy por cada pilar?"),
        (\.mejora, "¿Qué haría un 1% mejor mañana?"),
        (\.evite, "¿Qué evité hoy por pensarlo demasiado?"),
    ]

    var body: some View {
        let escrito = pillars.document.close(on: day)?.hasAnswers == true

        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.smooth(duration: 0.28)) { isOpen.toggle() }
            } label: {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text("Cierre del día")
                        .font(.system(size: 13, weight: .bold))
                        .tracking(1.4)
                        .textCase(.uppercase)
                        .foregroundStyle(Palette.text)
                    Text(escrito ? "guardado" : isOpen ? "tres respuestas cortas" : "para la noche")
                        .font(.system(size: 11))
                        .foregroundStyle(escrito ? Palette.accent : Palette.textFaint)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Palette.textFaint)
                        .rotationEffect(.degrees(isOpen ? 180 : 0))
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if isOpen {
                VStack(alignment: .leading, spacing: 18) {
                    ForEach(Array(Self.preguntas.enumerated()), id: \.offset) { _, q in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(q.1)
                                .font(.system(size: 13))
                                .foregroundStyle(Palette.textMuted)
                            // Se guarda mientras escribes: no hay botón que olvidar.
                            LineField(placeholder: "", text: Binding(
                                get: { pillars.document.close(on: day)?[keyPath: q.0] ?? "" },
                                set: { pillars.setAnswer(q.0, on: day, $0) }))
                        }
                    }
                }
                .padding(.top, 18)
                .transition(.opacity.combined(with: .offset(y: -6)))
            }
        }
        .padding(20)
        .cardSurface(Radius.card)
    }
}

// MARK: - Tema de la semana

private struct WeeklyThemePanel: View {
    let start: Date

    private static let temas: [(String, [String])] = [
        ("Responsabilidad", [
            "Escribe 3 excusas que te diste esta semana: tus balones fuera.",
            "Reescribe cada una como “depende de mí: puedo hacer X”.",
        ]),
        ("Energía y entorno", [
            "Lista 3 cosas que te drenan y 3 que te cargan.",
            "Elimina o reduce una de las que te drenan.",
        ]),
        ("Acción imperfecta", [
            "Elige algo que llevas más de una semana pensando.",
            "Ejecútalo en 48 horas, en su versión imperfecta.",
            "Antes, 5 minutos de premortem: qué puede salir mal y cómo lo evitas.",
        ]),
        ("Opinión ajena y personas", [
            "Anota qué decisión estás frenando por el qué dirán.",
            "Reescribe lo que te dices sobre esa decisión.",
            "Contacta a una persona clave esta semana.",
        ]),
    ]

    var body: some View {
        let cal = Calendar.current
        let dias = max(0, cal.dateComponents([.day], from: cal.startOfDay(for: start),
                                             to: cal.startOfDay(for: HabitDay.current())).day ?? 0)
        let semana = (dias / 7) % Self.temas.count
        let quedan = 7 - dias % 7
        let tema = Self.temas[semana]

        VStack(alignment: .leading, spacing: 0) {
            Text("semana \(semana + 1)/4 · \(quedan == 1 ? "último día" : "quedan \(quedan) días")")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Palette.textFaint)
            Text(tema.0)
                .font(.system(size: 24, weight: .black))
                .tracking(-0.5)
                .foregroundStyle(Palette.text)
                .padding(.top, 4)
                .padding(.bottom, 16)
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(tema.1.enumerated()), id: \.offset) { i, paso in
                    HStack(alignment: .firstTextBaseline, spacing: 14) {
                        Text(String(format: "%02d", i + 1))
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(Palette.accent)
                        Text(paso)
                            .font(.system(size: 13))
                            .foregroundStyle(Palette.textMuted)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .cardSurface(Radius.card)
    }
}

// MARK: - Revisión de la semana

private struct WeeklyReviewSheet: View {
    let day: String

    @Environment(PillarStore.self) private var pillars
    @Environment(\.dismiss) private var dismiss

    @State private var scores: [PillarId: Int] = [:]
    @State private var reflexion = ""
    @State private var mejora = ""
    @State private var pospuse = ""

    var body: some View {
        SheetShell(title: "Revisión de la semana", canSave: true, onCancel: { dismiss() }) {
            pillars.addReview(scores: scores,
                              reflexion: reflexion.trimmingCharacters(in: .whitespacesAndNewlines),
                              mejora1pct: mejora.trimmingCharacters(in: .whitespacesAndNewlines),
                              pospuse: pospuse.trimmingCharacters(in: .whitespacesAndNewlines),
                              on: day)
            dismiss()
        } content: {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(PillarId.allCases, id: \.self) { id in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(id.label)
                                .textCase(.uppercase)
                                .font(.system(size: 12, weight: .bold))
                                .tracking(1.1)
                                .foregroundStyle(Palette.text)
                            ScoreScale(value: Binding(
                                get: { scores[id] ?? pillars.pillar(id).scoreA },
                                set: { scores[id] = $0 }))
                        }
                    }
                }
                question("¿Cómo fue la semana?", $reflexion)
                question("¿Qué mejoré un 1%?", $mejora)
                question("¿Qué pospuse por pensar?", $pospuse)
            }
        }
        .onAppear {
            for id in PillarId.allCases where scores[id] == nil { scores[id] = pillars.pillar(id).scoreA }
        }
    }

    private func question(_ label: String, _ text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Palette.textMuted)
            LineField(placeholder: "", text: text)
        }
    }
}
