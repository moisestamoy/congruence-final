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
    @State private var showingDoneToday = false
    /// Grupos plegados, separados por coma. Se guarda para que al volver a
    /// abrir la app siga plegado lo que plegaste.
    @AppStorage("tasksCollapsedGroups") private var collapsedRaw = ""
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
                .padding(.vertical, 28)
                .frame(maxWidth: 672, alignment: .leading)
                .frame(maxWidth: .infinity)
            }
        }
        .background(Palette.base)
        .sheet(item: $editing) { task in
            TaskEditorSheet(task: task)
        }
        .sheet(isPresented: $newNote) { NoteEditorSheet(note: nil) }
        .background {
            Button("") { tab = .tareas; inputFocused = true }
                .keyboardShortcut("n", modifiers: .command)
                .opacity(0)
        }
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
        .frame(maxWidth: 672, alignment: .leading)
        .frame(maxWidth: .infinity)
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
        .frame(maxWidth: 672, alignment: .leading)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Tareas

    private var tareasView: some View {
        VStack(alignment: .leading, spacing: 18) {
            newTaskField
            if !store.document.groups.isEmpty { filters }

            let groups = store.grouped(groupId: filterGroupId, onlyPriority: onlyPriority)
            if groups.isEmpty {
                empty("Nada pendiente. Disfrutalo.")
                footer
            } else {
                ForEach(Array(groups.enumerated()), id: \.offset) { _, entry in
                    let key = entry.group?.id ?? ""
                    let collapsed = isCollapsed(key)
                    VStack(alignment: .leading, spacing: 2) {
                        Button { toggleCollapsed(key) } label: {
                            HStack(spacing: 7) {
                                Circle()
                                    .fill(Color.tint(entry.group?.color ?? "#7a8fa6"))
                                    .frame(width: 6, height: 6)
                                Text(entry.group?.name ?? "Sin grupo")
                                    .microLabelStyle(Palette.textMuted, size: 9)
                                Text("\(entry.tasks.count)")
                                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Palette.textFaint)
                                Image(systemName: "chevron.down")
                                    .font(.system(size: 7, weight: .bold))
                                    .foregroundStyle(Palette.textFaint)
                                    .rotationEffect(.degrees(collapsed ? -90 : 0))
                                Spacer()
                            }
                            .padding(.bottom, 6)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if !collapsed {
                            ForEach(entry.tasks) { task in
                                TaskRow(task: task, group: store.group(task.groupId),
                                        onToggle: { store.toggleTask(task.id) },
                                        onEdit: { editing = task },
                                        onDelete: { store.removeTask(task.id) })
                            }
                            .padding(.horizontal, -10)
                        }
                    }
                    .padding(.bottom, collapsed ? 4 : 14)
                }

                footer
            }
        }
    }

    /// El pie cuenta lo pendiente y, si completaste algo hoy, deja verlo y
    /// deshacerlo: al completar una tarea desaparece, y sin esto un clic sin
    /// querer no tenía vuelta atrás.
    private var footer: some View {
        let pending = store.pending(groupId: filterGroupId, onlyPriority: onlyPriority).count
        let doneToday = store.doneToday()
        return VStack(alignment: .leading, spacing: 10) {
            Divider().overlay(Palette.hairlineFaint)
            HStack(spacing: 8) {
                Text("\(pending) pendiente\(pending == 1 ? "" : "s")")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
                if !doneToday.isEmpty {
                    Text("·").foregroundStyle(Palette.textFaint)
                    Button {
                        withAnimation(.smooth(duration: 0.2)) { showingDoneToday.toggle() }
                    } label: {
                        HStack(spacing: 4) {
                            Text("\(doneToday.count) completada\(doneToday.count == 1 ? "" : "s") hoy")
                            Image(systemName: showingDoneToday ? "chevron.up" : "chevron.down")
                                .font(.system(size: 7, weight: .bold))
                        }
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(Palette.textMuted)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
            .padding(.top, 10)

            if showingDoneToday {
                ForEach(doneToday) { task in
                    HStack(spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(Palette.positive.opacity(0.7))
                        Text(task.text)
                            .font(.system(size: 13))
                            .strikethrough(color: Palette.textFaint)
                            .foregroundStyle(Palette.textFaint)
                        Spacer(minLength: 8)
                        Button("Deshacer") { store.toggleTask(task.id) }
                            .buttonStyle(.plain)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                    .padding(.vertical, 5)
                }
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

            // Siempre visible: cuando dependía del foco, al hacer clic en un
            // chip el campo lo perdía, la fila se ocultaba a mitad del clic y
            // el botón nunca se disparaba.
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

    private func isCollapsed(_ key: String) -> Bool {
        collapsedRaw.split(separator: ",").contains(Substring(key))
    }

    private func toggleCollapsed(_ key: String) {
        var keys = collapsedRaw.split(separator: ",").map(String.init)
        if let i = keys.firstIndex(of: key) { keys.remove(at: i) } else { keys.append(key) }
        withAnimation(.smooth(duration: 0.2)) { collapsedRaw = keys.joined(separator: ",") }
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
            // Sólo los grupos con algo pendiente: un filtro que no filtra nada
            // es ruido.
            ForEach(store.document.groups.filter { g in
                store.pending().contains { $0.groupId == g.id }
            }) { g in
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

    @State private var hovering = false

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
        .overlay(alignment: .leading) {
            if task.priority != .normal {
                Rectangle()
                    .fill(task.priority == .high ? Palette.negative : Palette.warning)
                    .frame(width: 2)
                    .padding(.vertical, 6)
                    .offset(x: -6)
            }
        }
        .padding(.horizontal, 10)
        .background(hovering ? Palette.fill(0.035) : .clear,
                    in: RoundedRectangle(cornerRadius: 8))
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        .onTapGesture(count: 2, perform: onEdit)
        .contextMenu {
            Button("Editar…", action: onEdit)
            Button("Completar", action: onToggle)
            Divider()
            Button("Borrar", role: .destructive, action: onDelete)
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

/// El chip de grupo. Abre una hoja en vez de un `Menu` porque macOS le quita
/// el estilo al label de un Menu (se pierden la cápsula y el punto de color),
/// y porque desde la hoja se puede crear un grupo sin salir de acá.
struct GroupPicker: View {
    @Binding var groupId: String?
    let groups: [TaskGroup]

    @State private var picking = false

    var body: some View {
        let current = groups.first { $0.id == groupId }
        Button { picking = true } label: {
            HStack(spacing: 5) {
                Circle()
                    .fill(Color.tint(current?.color ?? "#7a8fa6"))
                    .frame(width: 6, height: 6)
                Text(current?.name ?? "Sin grupo")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                Image(systemName: "chevron.down")
                    .font(.system(size: 7, weight: .bold))
                    .foregroundStyle(Palette.textFaint)
            }
            .padding(.horizontal, 12)
            .frame(height: 30)
            .background(Capsule().fill(Palette.fill(0.03)))
            .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .fixedSize()
        .sheet(isPresented: $picking) {
            GroupPickerSheet(groupId: $groupId, groups: groups)
        }
    }
}

struct GroupPickerSheet: View {
    @Binding var groupId: String?
    let groups: [TaskGroup]

    @Environment(TaskStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var newName = ""
    @State private var colorIndex = 0
    @FocusState private var newFocused: Bool

    /// La misma paleta que ya usan los grupos existentes.
    static let palette = ["#5b8dd9", "#c8920a", "#3aada8", "#a56ad4",
                          "#d4765a", "#6aa84f", "#7a8fa6"]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Grupo").font(.system(size: 18, weight: .bold))
                .foregroundStyle(Palette.text)

            VStack(alignment: .leading, spacing: 0) {
                row(color: "#7a8fa6", name: "Sin grupo", selected: groupId == nil) {
                    groupId = nil
                    dismiss()
                }
                ForEach(groups) { g in
                    row(color: g.color, name: g.name, selected: groupId == g.id) {
                        groupId = g.id
                        dismiss()
                    }
                }
            }

            Divider().overlay(Palette.hairlineFaint)

            VStack(alignment: .leading, spacing: 10) {
                Text("Nuevo grupo").microLabelStyle(Palette.textFaint, size: 9)
                HStack(spacing: 10) {
                    DarkField(placeholder: "Casa, Trabajo, Estudio…", text: $newName)
                        .focused($newFocused)
                        .onSubmit(create)
                    Button("Crear", action: create)
                        .buttonStyle(.plain)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(canCreate ? Palette.onAccent : Palette.textFaint)
                        .padding(.horizontal, 18)
                        .frame(height: 34)
                        .background(Capsule().fill(canCreate ? Palette.accent : Palette.fill(0.06)))
                        .disabled(!canCreate)
                }
                HStack(spacing: 10) {
                    ForEach(Array(Self.palette.enumerated()), id: \.offset) { i, hex in
                        Button { colorIndex = i } label: {
                            Circle()
                                .fill(Color.tint(hex))
                                .frame(width: 16, height: 16)
                                .overlay(
                                    Circle()
                                        .stroke(Palette.text, lineWidth: colorIndex == i ? 1.5 : 0)
                                        .padding(-3)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer()
                }
            }

            HStack {
                Spacer()
                Button("Cerrar") { dismiss() }
                    .buttonStyle(.plain)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut(.cancelAction)
            }
        }
        .padding(26)
        .frame(width: 400)
        .background(Palette.base)
        .onAppear { colorIndex = groups.count % Self.palette.count }
    }

    private var canCreate: Bool { !newName.trimmingCharacters(in: .whitespaces).isEmpty }

    private func create() {
        guard let id = store.addGroup(name: newName, color: Self.palette[colorIndex]) else { return }
        groupId = id
        dismiss()
    }

    private func row(color: String, name: String, selected: Bool,
                     action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 9) {
                Circle().fill(Color.tint(color)).frame(width: 7, height: 7)
                Text(name).font(.system(size: 13)).foregroundStyle(Palette.text)
                Spacer()
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.accent)
                }
            }
            .padding(.horizontal, 10)
            .frame(height: 34)
            .background(selected ? Palette.fill(0.04) : .clear,
                        in: RoundedRectangle(cornerRadius: 8))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
