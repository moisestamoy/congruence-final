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

/// Una nota del diario: título y texto libre.
struct NoteEditorSheet: View {
    let note: DiaryNote?

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var title: String
    @State private var content: String
    @State private var confirmingDelete = false

    init(note: DiaryNote?) {
        self.note = note
        _title = State(initialValue: note?.title ?? "")
        _content = State(initialValue: note?.content ?? "")
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty
            || !content.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(note == nil ? "Nueva nota" : "Editar nota")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Palette.text)

            DarkField(placeholder: "Título", text: $title)

            TextEditor(text: $content)
                .font(.system(size: 13))
                .foregroundStyle(Palette.text)
                .scrollContentBackground(.hidden)
                .padding(10)
                .frame(height: 260)
                .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Palette.hairlineFaint, lineWidth: 1))

            if let note {
                Text("Creada el \(DateFormatter.es("d 'de' MMMM, yyyy · HH:mm").string(from: note.date))")
                    .font(.system(size: 10)).foregroundStyle(Palette.textFaint)
            }

            HStack(spacing: 10) {
                if note != nil {
                    Button("Borrar") { confirmingDelete = true }
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Palette.negative)
                }
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
                Button("Guardar") {
                    if let note {
                        store.updateNote(note.id, title: title, content: content)
                    } else {
                        store.addNote(title: title, content: content)
                    }
                    dismiss()
                }
                .buttonStyle(.plain)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(canSave ? Palette.onAccent : Palette.textFaint)
                .padding(.horizontal, 20)
                .frame(height: 34)
                .background(Capsule().fill(canSave ? Palette.accent : Palette.fill(0.06)))
                .disabled(!canSave)
            }
        }
        .padding(26)
        .frame(width: 520)
        .background(Palette.base)
        .confirmationDialog("¿Borrar esta nota?", isPresented: $confirmingDelete) {
            Button("Borrar", role: .destructive) {
                if let note { store.removeNote(note.id) }
                dismiss()
            }
            Button("Cancelar", role: .cancel) {}
        }
    }
}
