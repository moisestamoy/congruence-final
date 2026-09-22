import SwiftUI

/// Tareas, con las mismas tres vistas que la web (ToDoPage.tsx): la lista
/// agrupada, lo que vence hoy, y el diario de notas.
struct TasksView: View {
    enum Tab: String, CaseIterable {
        case tareas, hoy, diario

        var label: String {
            switch self {
            case .tareas: return "Tareas"
            case .hoy:    return "Hoy"
            case .diario: return "Diario"
            }
        }
    }

    @Environment(TaskStore.self) private var store

    @State private var tab: Tab = .tareas
    @State private var draft = ""
    @State private var draftPriority: TaskPriority = .normal
    @State private var draftDeadline: Date?
    @State private var draftGroupId: String?
    @State private var filterGroupId: String?
    @State private var onlyPriority = false
    @State private var editing: TodoTask?
    @State private var newNote = false
    @State private var editingNote: DiaryNote?
    @FocusState private var inputFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            tabs
            Divider().overlay(Palette.hairlineFaint)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    switch tab {
                    case .tareas: tareasView
                    case .hoy:    hoyView
                    case .diario: diarioView
                    }
                }
                .padding(28)
                .frame(maxWidth: 900, alignment: .leading)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .background(Palette.base)
        .sheet(item: $editing) { task in
            TaskEditorSheet(task: task)
        }
        .sheet(isPresented: $newNote) { NoteEditorSheet(note: nil) }
        .sheet(item: $editingNote) { note in NoteEditorSheet(note: note) }
    }

    // MARK: - Encabezado

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(DateFormatter.es("EEEE, d 'de' MMMM 'de' yyyy").string(from: Date()).sentenceCased)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            Text("Tareas")
                .font(.system(size: 34, weight: .black))
                .tracking(-0.8)
                .foregroundStyle(Palette.text)
        }
        .padding(.horizontal, 28)
        .padding(.top, 28)
        .padding(.bottom, 18)
    }

    private var tabs: some View {
        HStack(spacing: 22) {
            ForEach(Tab.allCases, id: \.self) { t in
                Button { withAnimation(.smooth(duration: 0.2)) { tab = t } } label: {
                    VStack(spacing: 6) {
                        Text(t.label)
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.6)
                            .textCase(.uppercase)
                            .foregroundStyle(tab == t ? Palette.text : Palette.textFaint)
                        Rectangle()
                            .fill(tab == t ? Palette.text.opacity(0.4) : .clear)
                            .frame(height: 1)
                    }
                    .fixedSize()
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.horizontal, 28)
    }

    // MARK: - Tareas

    private var tareasView: some View {
        VStack(alignment: .leading, spacing: 18) {
            newTaskField
            if !store.document.groups.isEmpty { filters }

            let groups = store.grouped(groupId: filterGroupId, onlyPriority: onlyPriority)
            if groups.isEmpty {
                empty("Nada pendiente. Disfrutalo.")
            } else {
                ForEach(Array(groups.enumerated()), id: \.offset) { _, entry in
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 7) {
                            Circle()
                                .fill(Color.tint(entry.group?.color ?? "#7a8fa6"))
                                .frame(width: 6, height: 6)
                            Text(entry.group?.name ?? "Sin grupo")
                                .microLabelStyle(Palette.textMuted, size: 9)
                        }
                        .padding(.bottom, 6)

                        ForEach(entry.tasks) { task in
                            TaskRow(task: task, group: store.group(task.groupId),
                                    onToggle: { store.toggleTask(task.id) },
                                    onEdit: { editing = task },
                                    onDelete: { store.removeTask(task.id) })
                        }
                    }
                    .padding(.bottom, 14)
                }

                let pending = store.pending(groupId: filterGroupId, onlyPriority: onlyPriority).count
                let done = store.completedToday()
                Divider().overlay(Palette.hairlineFaint)
                Text("\(pending) pendiente\(pending == 1 ? "" : "s")"
                     + (done > 0 ? " · \(done) completada\(done == 1 ? "" : "s") hoy" : ""))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
                    .padding(.top, 10)
            }
        }
    }

    private var newTaskField: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.textFaint)
                TextField("", text: $draft, prompt: Text("Escribí una tarea y apretá Enter"))
                    .textFieldStyle(.plain)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.text)
                    .focused($inputFocused)
                    .onSubmit(addTask)
            }
            .padding(.horizontal, 14)
            .frame(height: 46)
            .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12)
                .stroke(inputFocused ? Palette.accent.opacity(0.4) : Palette.hairlineFaint, lineWidth: 1))

            if inputFocused || !draft.isEmpty {
                HStack(spacing: 8) {
                    ForEach(TaskPriority.allCases, id: \.self) { p in
                        Chip(label: p == .normal ? "Normal" : p.rawValue,
                             isSelected: draftPriority == p,
                             tint: p == .high ? Palette.negative : Palette.accent) {
                            draftPriority = p
                        }
                    }
                    Divider().frame(height: 18).overlay(Palette.hairlineFaint)
                    DeadlineField(date: $draftDeadline)
                    GroupPicker(groupId: $draftGroupId, groups: store.document.groups)
                    Spacer()
                }
            }
        }
    }

    private func addTask() {
        store.addTask(text: draft, priority: draftPriority,
                      deadline: draftDeadline.map(HabitDay.key), groupId: draftGroupId)
        draft = ""
        draftPriority = .normal
        draftDeadline = nil
    }

    private var filters: some View {
        HStack(spacing: 6) {
            Chip(label: "Todo", isSelected: filterGroupId == nil && !onlyPriority,
                 tint: Palette.accent) {
                filterGroupId = nil; onlyPriority = false
            }
            Chip(label: "Prioritarias", isSelected: onlyPriority, tint: Palette.negative) {
                onlyPriority.toggle()
            }
            ForEach(store.document.groups) { g in
                Chip(label: g.name, isSelected: filterGroupId == g.id,
                     tint: Color.tint(g.color)) {
                    filterGroupId = filterGroupId == g.id ? nil : g.id
                }
            }
            Spacer()
        }
    }

    // MARK: - Hoy

    private var hoyView: some View {
        let list = store.dueToday()
        return VStack(alignment: .leading, spacing: 2) {
            if list.isEmpty {
                empty("Nada por hoy · descansá")
            } else {
                ForEach(list) { task in
                    TaskRow(task: task, group: store.group(task.groupId),
                            onToggle: { store.toggleTask(task.id) },
                            onEdit: { editing = task },
                            onDelete: { store.removeTask(task.id) })
                }
                Divider().overlay(Palette.hairlineFaint).padding(.top, 10)
                Text("\(list.count) tarea\(list.count == 1 ? "" : "s") para hoy")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
                    .padding(.top, 10)
            }
        }
    }

    // MARK: - Diario

    private var diarioView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button { newNote = true } label: {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.pencil").font(.system(size: 10, weight: .bold))
                    Text("Nueva nota").font(.system(size: 11, weight: .bold)).tracking(1).textCase(.uppercase)
                }
                .foregroundStyle(Palette.onAccent)
                .padding(.horizontal, 16)
                .frame(height: 34)
                .background(Palette.accent, in: Capsule())
            }
            .buttonStyle(.plain)

            if store.document.notes.isEmpty {
                empty("El diario está vacío.")
            } else {
                ForEach(store.document.notes) { note in
                    Button { editingNote = note } label: { noteCard(note) }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("Borrar", role: .destructive) { store.removeNote(note.id) }
                        }
                }
            }
        }
    }

    private func noteCard(_ note: DiaryNote) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(note.title.isEmpty ? "Sin título" : note.title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Palette.text)
                Spacer()
                Text(DateFormatter.es("d MMM yyyy · HH:mm").string(from: note.date))
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
            }
            if !note.content.isEmpty {
                Text(note.content)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.textMuted)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.hairlineFaint, lineWidth: 1))
        .contentShape(Rectangle())
    }

    private func empty(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 17, weight: .light, design: .serif))
            .italic()
            .foregroundStyle(Palette.textFaint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 44)
    }
}

// MARK: - Una tarea

struct TaskRow: View {
    let task: TodoTask
    let group: TaskGroup?
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    private var isOverdue: Bool {
        guard let d = task.deadline else { return false }
        return d < HabitDay.key(HabitDay.current())
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Circle()
                    .stroke(Palette.hairline, lineWidth: 1.5)
                    .frame(width: 17, height: 17)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Text(task.text)
                .font(.system(size: 14))
                .foregroundStyle(Palette.text)

            if task.priority != .normal {
                Text(task.priority.rawValue)
                    .font(.system(size: 12, weight: .black))
                    .foregroundStyle(task.priority == .high ? Palette.negative : Palette.warning)
            }

            Spacer(minLength: 8)

            if let deadline = task.deadline {
                Text(Self.deadlineLabel(deadline))
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(isOverdue ? Palette.negative : Palette.textFaint)
            }
            if let group {
                Circle().fill(Color.tint(group.color)).frame(width: 6, height: 6)
            }
        }
        .padding(.vertical, 9)
        .contentShape(Rectangle())
        .onTapGesture(count: 2, perform: onEdit)
        .contextMenu {
            Button("Editar…", action: onEdit)
            Button("Completar", action: onToggle)
            Divider()
            Button("Borrar", role: .destructive, action: onDelete)
        }
        .overlay(alignment: .leading) {
            if task.priority != .normal {
                Rectangle()
                    .fill(task.priority == .high ? Palette.negative : Palette.warning)
                    .frame(width: 2)
                    .padding(.vertical, 6)
                    .offset(x: -10)
            }
        }
    }

    static func deadlineLabel(_ key: String) -> String {
        let today = HabitDay.key(HabitDay.current())
        let yesterday = HabitDay.key(HabitDay.adding(-1, to: HabitDay.current()))
        if key == today { return "hoy" }
        if key == yesterday { return "ayer" }
        return DateFormatter.es("d MMM").string(from: FinDate.date(key))
    }
}

// MARK: - Controles chicos

struct DeadlineField: View {
    @Binding var date: Date?

    var body: some View {
        HStack(spacing: 4) {
            if let bound = Binding($date) {
                DatePicker("", selection: bound, displayedComponents: .date)
                    .labelsHidden()
                    .datePickerStyle(.compact)
                    .environment(\.locale, Locale(identifier: "es"))
                Button { date = nil } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint)
                }
                .buttonStyle(.plain)
            } else {
                Chip(label: "Sin fecha", isSelected: false, tint: Palette.accent) {
                    date = Date()
                }
            }
        }
    }
}

struct GroupPicker: View {
    @Binding var groupId: String?
    let groups: [TaskGroup]

    var body: some View {
        Menu {
            Button("Sin grupo") { groupId = nil }
            ForEach(groups) { g in
                Button(g.name) { groupId = g.id }
            }
        } label: {
            let current = groups.first { $0.id == groupId }
            HStack(spacing: 5) {
                Circle()
                    .fill(Color.tint(current?.color ?? "#7a8fa6"))
                    .frame(width: 6, height: 6)
                Text(current?.name ?? "Sin grupo")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
            }
            .padding(.horizontal, 12)
            .frame(height: 30)
            .background(Capsule().fill(Palette.fill(0.03)))
            .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .fixedSize()
    }
}
