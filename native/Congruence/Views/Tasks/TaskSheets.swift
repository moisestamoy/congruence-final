import SwiftUI

/// Editar una tarea: texto, prioridad, fecha y grupo.
struct TaskEditorSheet: View {
    let task: TodoTask

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var text: String
    @State private var priority: TaskPriority
    @State private var deadline: Date?
    @State private var groupId: String?
    @State private var confirmingDelete = false

    init(task: TodoTask) {
        self.task = task
        _text = State(initialValue: task.text)
        _priority = State(initialValue: task.priority)
        _deadline = State(initialValue: task.deadline.map(FinDate.date))
        _groupId = State(initialValue: task.groupId)
    }

    private var canSave: Bool { !text.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Editar tarea").font(.system(size: 18, weight: .bold))
                .foregroundStyle(Palette.text)

            field("Tarea") { DarkField(placeholder: "Qué hay que hacer", text: $text) }

            field("Prioridad") {
                HStack(spacing: 8) {
                    ForEach(TaskPriority.allCases, id: \.self) { p in
                        Chip(label: p == .normal ? "Normal" : p.rawValue,
                             isSelected: priority == p,
                             tint: p == .high ? Palette.negative : Palette.accent,
                             fillsWidth: true) { priority = p }
                    }
                }
            }

            HStack(alignment: .top, spacing: 14) {
                field("Para cuándo") { DeadlineField(date: $deadline) }
                field("Grupo") { GroupPicker(groupId: $groupId, groups: store.document.groups) }
                Spacer()
            }

            HStack(spacing: 10) {
                Button("Borrar") { confirmingDelete = true }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.negative)
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
                Button("Guardar") {
                    store.updateTask(task.id, text: text, priority: priority,
                                     deadline: deadline.map(HabitDay.key), groupId: groupId)
                    dismiss()
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(canSave ? Palette.onAccent : Palette.textFaint)
                .padding(.horizontal, 20)
                .frame(height: 34)
                .background(Capsule().fill(canSave ? Palette.accent : Palette.fill(0.06)))
                .disabled(!canSave)
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(26)
        .frame(width: 460)
        .background(Palette.base)
        .confirmationDialog("¿Borrar esta tarea?", isPresented: $confirmingDelete) {
            Button("Borrar", role: .destructive) {
                store.removeTask(task.id)
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        }
    }

    @ViewBuilder
    private func field<C: View>(_ label: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            content()
        }
    }
}

/// Escribir una nota nueva, ahí mismo en el Diario.
///
/// Antes era una ventana modal flotando encima de todo. Una nota no es un
/// formulario que se confirma: es algo que se escribe donde vive, así que
/// ahora nace en la misma lista en la que va a quedar.
struct NoteComposer: View {
    /// El día en el que se guarda.
    var day: Date = Date()
    /// Cambia cuando algo de afuera pide empezar a escribir.
    var focusToken: Int = 0

    @Environment(TaskStore.self) private var store
    @Environment(HabitStore.self) private var habits
    @Environment(FinanceStore.self) private var finances

    @State private var content = ""
    @State private var savedId: String?
    @State private var saving: Task<Void, Never>?
    @State private var phase: Phase = .writing
    @FocusState private var writing: Bool

    /// Sacar lo que tienes en la cabeza y revisar el día son dos trabajos
    /// distintos, y mezclarlos rompe el primero: si lo primero que ves al ir a
    /// escribir es tu marcador, dejas de escribir lo que traías y empiezas a
    /// justificar cómo quedaste. Así que van en dos tiempos.
    private enum Phase {
        /// Caja vacía. Ni porcentaje, ni hábitos, ni déficit, ni la promesa de
        /// ayer. Nada que juzgar antes de la primera palabra.
        case writing
        /// Ya quedó registrado. Sólo entonces se ofrece el contraste.
        case saved
        /// Los datos del día, como contraste de lo que ya escribiste.
        case review
    }

    private var open: Bool { writing || !content.isEmpty || phase != .writing }

    private var hasSomething: Bool {
        !content.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private var isToday: Bool {
        HabitDay.key(day) == HabitDay.key(HabitDay.current())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if phase == .review { reviewHeader }

            if phase == .saved {
                savedStrip
            } else {
                NoteBody(text: $content,
                         placeholder: "¿Qué está ocupando espacio en tu cabeza?",
                         serif: true)
                    .focused($writing)
                    .frame(minHeight: open ? 170 : 26)
                    .padding(.horizontal, 12)
                    .padding(.vertical, open ? 10 : 12)

                if open { footer }
            }
        }
        .background(RoundedRectangle(cornerRadius: 14).fill(Palette.fill(open ? 0.06 : 0.035)))
        .overlay(RoundedRectangle(cornerRadius: 14)
            .stroke(open ? Palette.accent.opacity(0.35) : Palette.hairlineFaint, lineWidth: 1))
        .animation(.smooth(duration: 0.22), value: open)
        .animation(.smooth(duration: 0.22), value: phase)
        .contentShape(Rectangle())
        .onTapGesture { if !open { writing = true } }
        .onChange(of: focusToken) { _, _ in writing = true }
        .onChange(of: content) { _, _ in scheduleSave() }
        .onDisappear { saving?.cancel(); persist() }
    }

    // MARK: - Piezas

    /// Los arranques son neutros a propósito: te dan el primer empujón sin
    /// decirte cómo te fue. Uno que dijera "la brecha estuvo en" ya sería el
    /// marcador colándose antes de tiempo.
    private var footer: some View {
        VStack(alignment: .leading, spacing: 10) {
            if content.isEmpty {
                HStack(spacing: 6) {
                    ForEach(DiaryPrompt.starters, id: \.self) { inicio in
                        Button {
                            content = inicio + " "
                            writing = true
                        } label: {
                            Text(inicio)
                                .font(.system(size: 11, design: .serif))
                                .italic()
                                .foregroundStyle(Palette.textMuted)
                                .padding(.horizontal, 10)
                                .frame(height: 24)
                                .background(Capsule().fill(Palette.fill(0.05)))
                                .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
                                .contentShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer()
                }
            }

            HStack {
                Spacer()
                Button(phase == .review ? "Terminar" : "Listo") { finish() }
                    .buttonStyle(.plain)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(hasSomething ? Palette.accent : Palette.textFaint)
                    .disabled(!hasSomething)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 12)
    }

    private var savedStrip: some View {
        HStack(spacing: 14) {
            Text("Registrado")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Palette.positive.opacity(0.85))
            Spacer()
            Button("Terminar") { reset() }
                .buttonStyle(.plain)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            Button("Revisar contra mi día") {
                phase = .review
                writing = true
            }
            .buttonStyle(.plain)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Palette.accent)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 16)
    }

    /// Los datos del día, sólo acá: ya escribiste, ahora hay contra qué
    /// contrastar. La pregunta ya no define qué pensar, sólo ofrece el choque.
    private var reviewHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !facts.lines.isEmpty {
                Text(facts.lines.joined(separator: "  ·  "))
                    .microLabelStyle(Palette.textFaint, size: 9)
            }
            Text(prompt.text)
                .font(.system(size: 15, weight: .semibold, design: .serif))
                .foregroundStyle(Palette.text)
                .fixedSize(horizontal: false, vertical: true)

            if let promise = prompt.promise {
                Text("“\(promise)”")
                    .font(.system(size: 13, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.leading, 10)
                    .overlay(alignment: .leading) {
                        Rectangle().fill(Palette.accent.opacity(0.5)).frame(width: 2)
                    }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 14)
        .padding(.bottom, 4)
    }

    // MARK: - Datos del día

    private var facts: DiaryFacts {
        let key = HabitDay.key(day)
        let aplicables = habits.habits.filter { $0.logs[key]?.isPaused != true }
        return DiaryFacts(
            congruence: habits.congruence(on: key),
            habitsDone: aplicables.filter { $0.logs[key]?.completed == true }.count,
            habitsTotal: aplicables.count,
            tasksDone: store.completedToday(),
            inDeficit: isToday
                && FinanceEngine.today(doc: finances.document)?.status == .critical
        )
    }

    private var prompt: DiaryPrompt {
        let key = HabitDay.key(day)
        let missing = habits.habits
            .filter { $0.logs[key]?.completed != true && $0.logs[key]?.isPaused != true }
            .map(\.title)
        let ayer = store.notes(on: HabitDay.adding(-1, to: day))
            .compactMap { DiaryPrompt.findPromise(in: $0.content) }
            .first
        return DiaryPrompt.forToday(facts: facts, missing: missing,
                                    streak: habits.streak(), writtenDays: 0,
                                    yesterdayPromise: ayer, isToday: isToday)
    }

    // MARK: - Guardado

    private func scheduleSave() {
        saving?.cancel()
        saving = Task {
            try? await Task.sleep(for: .seconds(1.2))
            guard !Task.isCancelled else { return }
            persist()
        }
    }

    /// Crea la nota la primera vez y la actualiza el resto. El título sale de
    /// las primeras palabras: pedirlo antes sería pedir el resumen de algo que
    /// todavía no existe.
    private func persist() {
        guard hasSomething else { return }
        let cuerpo = content.trimmingCharacters(in: .whitespacesAndNewlines)
        let titulo = Self.derivedTitle(from: cuerpo)
        if let id = savedId {
            store.updateNote(id, title: titulo, content: cuerpo)
        } else {
            store.addNote(title: titulo, content: cuerpo, on: day)
            savedId = store.notes(on: day).first?.id
        }
    }

    private func finish() {
        saving?.cancel()
        persist()
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        writing = false
        phase = phase == .review ? .writing : .saved
        if phase == .writing { reset() }
    }

    private func reset() {
        content = ""
        savedId = nil
        phase = .writing
        writing = false
    }

    private static func derivedTitle(from body: String) -> String {
        let primera = body.split(separator: "\n").first.map(String.init) ?? body
        let palabras = primera.split(separator: " ").prefix(7).joined(separator: " ")
        return palabras.count < primera.count ? palabras + "…" : palabras
    }
}

/// Una nota de la lista. Se abre en su sitio para editarla, sin ventanas.
struct NoteCard: View {
    let note: DiaryNote

    @Environment(TaskStore.self) private var store
    @State private var expanded = false
    @State private var title = ""
    @State private var content = ""
    @State private var confirmingDelete = false
    @State private var hovering = false

    private var dirty: Bool { title != note.title || content != note.content }

    var body: some View {
        Group {
            if expanded {
                card
            } else {
                // Cerrada es un botón, no un gesto suelto: así también se
                // alcanza con el teclado y con un lector de pantalla.
                Button(action: open) { card }
                    .buttonStyle(.plain)
            }
        }
        .animation(.smooth(duration: 0.22), value: expanded)
        .confirmationDialog("¿Borrar esta nota?", isPresented: $confirmingDelete) {
            Button("Borrar", role: .destructive) {
                SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                withAnimation(.smooth(duration: 0.25)) { store.removeNote(note.id) }
            }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                if expanded {
                    NoteField(placeholder: "Sin título", text: $title, size: 15, weight: .bold)
                } else {
                    Text(note.title.isEmpty ? "Sin título" : note.title)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Palette.text)
                }
                Spacer(minLength: 10)
                Text(DateFormatter.es("d MMM yyyy · HH:mm").string(from: note.date))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
            }

            if expanded {
                Divider().overlay(Palette.hairlineFaint)

                NoteBody(text: $content, placeholder: "Escribe lo que pasó, o lo que entendiste.")
                    .frame(height: 220)

                HStack(spacing: 14) {
                    Button("Borrar") { confirmingDelete = true }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.negative.opacity(0.8))
                    Spacer()
                    Button("Cerrar") { close(saving: false) }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                    Button("Guardar") { close(saving: true) }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(dirty ? Palette.accent : Palette.textFaint)
                        .disabled(!dirty)
                }
            } else if !note.content.isEmpty {
                Text(note.content)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.textMuted)
                    .lineSpacing(4)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14)
            .fill(Palette.fill(expanded ? 0.06 : hovering ? 0.05 : 0.035)))
        .overlay(RoundedRectangle(cornerRadius: 14)
            .stroke(expanded ? Palette.accent.opacity(0.3) : Palette.hairlineFaint, lineWidth: 1))
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
    }

    private func open() {
        title = note.title
        content = note.content
        expanded = true
    }

    private func close(saving: Bool) {
        if saving, dirty { store.updateNote(note.id, title: title, content: content) }
        expanded = false
    }
}

/// Un campo de una línea sin caja: el marcador va a mano porque macOS ignora
/// el color del `prompt` y lo deja del gris claro del sistema.
struct NoteField: View {
    let placeholder: String
    @Binding var text: String
    var size: CGFloat = 15
    var weight: Font.Weight = .bold

    var body: some View {
        ZStack(alignment: .leading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: size, weight: weight))
                    .foregroundStyle(Palette.textFaint.opacity(0.7))
                    .allowsHitTesting(false)
            }
            TextField("", text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: size, weight: weight))
                .foregroundStyle(Palette.text)
        }
    }
}

/// El cuerpo de una nota: texto sobre el fondo, sin recuadro propio.
struct NoteBody: View {
    @Binding var text: String
    let placeholder: String
    /// El diario se escribe en serif. Un texto largo en la tipografía de la
    /// interfaz se lee como un formulario; en serif se lee como una página.
    var serif = false

    private var font: Font {
        .system(size: serif ? 15 : 13, design: serif ? .serif : .default)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(font)
                    .foregroundStyle(Palette.textFaint.opacity(0.7))
                    .padding(.top, 8)
                    .padding(.leading, 5)
                    .allowsHitTesting(false)
            }
            TextEditor(text: $text)
                .font(font)
                .foregroundStyle(Palette.text)
                .lineSpacing(serif ? 7 : 4)
                .scrollContentBackground(.hidden)
                .background(.clear)
                .padding(.leading, -5)
        }
    }
}
