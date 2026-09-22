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

/// Una nota del diario. Se dibuja como un documento, no como un formulario:
/// el título es un título y el cuerpo es texto sobre el fondo de la hoja.
/// Antes eran dos cajas grises anidadas sobre una hoja gris, que en modo
/// claro quedaban todas del mismo valor y no se distinguía nada.
struct NoteEditorSheet: View {
    let note: DiaryNote?

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var content: String
    @State private var confirmingDelete = false
    @FocusState private var titleFocused: Bool

    init(note: DiaryNote?) {
        self.note = note
        _title = State(initialValue: note?.title ?? "")
        _content = State(initialValue: note?.content ?? "")
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            || !content.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func save() {
        guard canSave else { return }
        if let note {
            store.updateNote(note.id, title: title, content: content)
        } else {
            store.addNote(title: title, content: content)
            SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        }
        dismiss()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // macOS ignora el color del `prompt`, así que el marcador va a
            // mano: si se parece a texto escrito, la nota parece llena.
            ZStack(alignment: .leading) {
                if title.isEmpty {
                    Text("Título")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Palette.textFaint.opacity(0.55))
                        .allowsHitTesting(false)
                }
                TextField("", text: $title)
                    .textFieldStyle(.plain)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(Palette.text)
                    .focused($titleFocused)
            }
            .padding(.bottom, 14)

            Divider().overlay(Palette.hairlineFaint)

            ZStack(alignment: .topLeading) {
                if content.isEmpty {
                    Text("Escribe lo que pasó, o lo que entendiste.")
                        .font(.system(size: 14))
                        .foregroundStyle(Palette.textFaint.opacity(0.55))
                        .padding(.top, 16)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $content)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.text)
                    .lineSpacing(5)
                    .scrollContentBackground(.hidden)
                    .background(.clear)
                    .padding(.top, 10)
                    .padding(.leading, -5)
            }
            .frame(height: 300)

            Divider().overlay(Palette.hairlineFaint)

            HStack(spacing: 16) {
                if let note {
                    Text(DateFormatter.es("d 'de' MMMM, yyyy · HH:mm").string(from: note.date))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(Palette.textFaint)
                    Button("Borrar") { confirmingDelete = true }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.negative.opacity(0.8))
                }
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
                Button("Guardar", action: save)
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(canSave ? Palette.accent : Palette.textFaint)
                    .disabled(!canSave)
            }
            .padding(.top, 14)
        }
        .padding(28)
        .frame(width: 540)
        .background(Palette.surface)
        .onAppear { titleFocused = note == nil }
        .confirmationDialog("¿Borrar esta nota?", isPresented: $confirmingDelete) {
            Button("Borrar", role: .destructive) {
                if let note { store.removeNote(note.id) }
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        }
    }
}
