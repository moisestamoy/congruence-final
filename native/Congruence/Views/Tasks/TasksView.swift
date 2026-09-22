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
            HStack(alignment: .firstTextBaseline) {
                Text("Tareas")
                    .font(.system(size: 34, weight: .black))
                    .tracking(-0.8)
                    .foregroundStyle(Palette.text)
                Spacer()
                Button { store.toggleSound() } label: {
                    Text(store.document.soundEnabled ? "♪" : "♩")
                        .font(.system(size: 15))
                        .foregroundStyle(store.document.soundEnabled ? Palette.accent : Palette.textFaint)
                        .frame(width: 26, height: 26)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help(store.document.soundEnabled ? "Silenciar" : "Activar sonido")
            }
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
                empty("Nada pendiente. Disfrútalo.")
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
                                        sound: store.document.soundEnabled,
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
                        Button("Deshacer") {
                            SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                            withAnimation(.smooth(duration: 0.25)) { store.toggleTask(task.id) }
                        }
                            .buttonStyle(.plain)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(Palette.accent)
                    }
                    .padding(.vertical, 5)
                }
            }
        }
    }

    /// Todo lo de escribir una tarea vive dentro de una sola tarjeta: el
    /// texto arriba, los ajustes abajo de una línea fina. Antes eran dos
    /// filas de píldoras idénticas — una configuraba la tarea, la otra
    /// filtraba la lista — y se leían como una sola sopa de diez botones.
    private var newTaskField: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(inputFocused ? Palette.accent : Palette.textFaint)
                TextField("", text: $draft, prompt: Text("Escribe una tarea y pulsa Enter"))
                    .textFieldStyle(.plain)
                    .font(.system(size: 14))
                    .foregroundStyle(Palette.text)
                    .focused($inputFocused)
                    .onSubmit(addTask)
                    .onChange(of: draft) { old, new in
                        // Sólo al escribir, no al vaciar el campo tras guardar.
                        if new.count > old.count {
                            SoundEffects.shared.play(.key, enabled: store.document.soundEnabled)
                        }
                    }
            }
            .padding(.horizontal, 14)
            .frame(height: 44)

            Divider().overlay(Palette.hairlineFaint)

            HStack(spacing: 4) {
                ForEach(TaskPriority.allCases, id: \.self) { p in
                    FlatOption(label: p == .normal ? "Normal" : p.rawValue,
                               isSelected: draftPriority == p,
                               tint: p == .high ? Palette.negative
                                   : p == .medium ? Palette.warning : Palette.accent) {
                        draftPriority = p
                    }
                }
                Rectangle().fill(Palette.hairlineFaint)
                    .frame(width: 1, height: 14)
                    .padding(.horizontal, 4)
                DeadlineField(date: $draftDeadline)
                GroupPicker(groupId: $draftGroupId, groups: store.document.groups)
                Spacer()
            }
            .padding(.horizontal, 8)
            .frame(height: 36)
        }
        .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12)
            .stroke(inputFocused ? Palette.accent.opacity(0.35) : Palette.hairlineFaint, lineWidth: 1))
        .animation(.smooth(duration: 0.18), value: inputFocused)
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
        guard !draft.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.25)) {
            store.addTask(text: draft, priority: draftPriority,
                          deadline: draftDeadline.map(HabitDay.key), groupId: draftGroupId)
        }
        draft = ""
        draftPriority = .normal
        draftDeadline = nil
    }

    /// Los filtros hablan el idioma de las pestañas de arriba — etiqueta
    /// chica en mayúsculas, sin cápsula — para que no compitan con la
    /// tarjeta de escribir, que es lo único con forma de control acá.
    private var filters: some View {
        HStack(spacing: 16) {
            FilterLabel(text: "Todo", isSelected: filterGroupId == nil && !onlyPriority,
                        tint: Palette.text) {
                filterGroupId = nil; onlyPriority = false
            }
            FilterLabel(text: "Prioritarias", isSelected: onlyPriority,
                        tint: Palette.negative) {
                onlyPriority.toggle()
            }
            // Sólo los grupos con algo pendiente: un filtro que no filtra nada
            // es ruido.
            ForEach(store.document.groups.filter { g in
                store.pending().contains { $0.groupId == g.id }
            }) { g in
                FilterLabel(text: g.name, isSelected: filterGroupId == g.id,
                            tint: Color.tint(g.color), dot: Color.tint(g.color)) {
                    filterGroupId = filterGroupId == g.id ? nil : g.id
                }
            }
            Spacer()
        }
        .padding(.horizontal, 2)
    }

    // MARK: - Hoy

    private var hoyView: some View {
        let list = store.dueToday()
        return VStack(alignment: .leading, spacing: 2) {
            if list.isEmpty {
                empty("Nada por hoy · descansa")
            } else {
                ForEach(list) { task in
                    TaskRow(task: task, group: store.group(task.groupId),
                            sound: store.document.soundEnabled,
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
                .foregroundStyle(Palette.accent)
                .padding(.horizontal, 16)
                .frame(height: 32)
                .background(Capsule().fill(Palette.accent.opacity(0.08)))
                .overlay(Capsule().stroke(Palette.accent.opacity(0.3), lineWidth: 1))
            }
            .buttonStyle(.plain)

            if store.document.notes.isEmpty {
                empty("El diario está vacío.")
            } else {
                ForEach(store.document.notes) { note in
                    Button { editingNote = note } label: { noteCard(note) }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("Borrar", role: .destructive) {
                                SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                                withAnimation(.smooth(duration: 0.25)) { store.removeNote(note.id) }
                            }
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
        .cardSurface(14, raised: true)
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
    let sound: Bool
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var hovering = false
    /// Al completar, la tarea desaparece de la lista. Este instante deja ver
    /// el círculo llenarse antes de que se vaya; sin él el clic no tiene
    /// respuesta, sólo una fila que se esfuma.
    @State private var completing = false

    private var isOverdue: Bool {
        guard let d = task.deadline else { return false }
        return d < HabitDay.key(HabitDay.current())
    }

    private var accent: Color {
        task.priority == .high ? Palette.negative
            : task.priority == .medium ? Palette.warning : Palette.accent
    }

    private func complete() {
        guard !completing else { return }
        SoundEffects.shared.play(.bell, enabled: sound)
        withAnimation(.spring(duration: 0.25)) { completing = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.26) {
            withAnimation(.smooth(duration: 0.28)) { onToggle() }
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: complete) {
                ZStack {
                    Circle()
                        .stroke(completing ? accent : Palette.hairline, lineWidth: 1.5)
                        .frame(width: 17, height: 17)
                    Circle()
                        .fill(accent)
                        .frame(width: 17, height: 17)
                        .scaleEffect(completing ? 1 : 0.01)
                        .opacity(completing ? 1 : 0)
                    Image(systemName: "checkmark")
                        .font(.system(size: 8, weight: .black))
                        .foregroundStyle(Palette.onAccent)
                        .opacity(completing ? 1 : 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Text(task.text)
                .font(.system(size: 14))
                .foregroundStyle(completing ? Palette.textFaint : Palette.text)
                .strikethrough(completing, color: Palette.textFaint)

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
            Button("Completar", action: complete)
            Divider()
            Button("Borrar", role: .destructive) {
                SoundEffects.shared.play(.pop, enabled: sound)
                withAnimation(.smooth(duration: 0.25)) { onDelete() }
            }
        }
        // Entra desde arriba y sale hacia la derecha, como en la web.
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .offset(y: -6)),
            removal: .opacity.combined(with: .offset(x: 30))
        ))
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
        if let bound = Binding($date) {
            HStack(spacing: 2) {
                DatePicker("", selection: bound, displayedComponents: .date)
                    .labelsHidden()
                    .datePickerStyle(.compact)
                    .environment(\.locale, Locale(identifier: "es"))
                    .scaleEffect(0.85, anchor: .leading)
                    .frame(width: 92)
                Button { date = nil } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Palette.textFaint)
                        .frame(width: 16, height: 16)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        } else {
            FlatOption(label: "Sin fecha", isSelected: false, tint: Palette.accent,
                       icon: "calendar") {
                date = Date()
            }
        }
    }
}

/// Un ajuste dentro de la tarjeta de escribir: texto plano, y sólo cuando
/// está elegido se enciende con un fondo apenas teñido. Sin cápsula ni borde,
/// para que la tarjeta siga leyéndose como un objeto y no como diez.
struct FlatOption: View {
    let label: String
    let isSelected: Bool
    var tint: Color = Palette.accent
    var icon: String?
    var trailingIcon: String?
    var dot: Color?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                if let dot {
                    Circle().fill(dot).frame(width: 5, height: 5)
                }
                if let icon {
                    Image(systemName: icon).font(.system(size: 9, weight: .semibold))
                }
                Text(label)
                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                    .lineLimit(1)
                if let trailingIcon {
                    Image(systemName: trailingIcon).font(.system(size: 6, weight: .bold))
                }
            }
            .foregroundStyle(isSelected ? tint : Palette.textMuted)
            .padding(.horizontal, 9)
            .frame(height: 24)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isSelected ? tint.opacity(0.11) : .clear)
            )
            .contentShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.18), value: isSelected)
    }
}

/// Un filtro de la lista. Es texto, no un control: el único control con forma
/// de tal en esta pantalla es la tarjeta de escribir.
struct FilterLabel: View {
    let text: String
    let isSelected: Bool
    var tint: Color = Palette.text
    var dot: Color?
    let action: () -> Void

    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 5) {
                HStack(spacing: 5) {
                    if let dot {
                        Circle().fill(dot)
                            .frame(width: 5, height: 5)
                            .opacity(isSelected ? 1 : 0.55)
                    }
                    Text(text)
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1.2)
                        .textCase(.uppercase)
                }
                .foregroundStyle(isSelected ? tint
                                 : hovering ? Palette.textMuted : Palette.textFaint)
                Rectangle()
                    .fill(isSelected ? tint.opacity(0.5) : .clear)
                    .frame(height: 1)
            }
            .fixedSize()
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.smooth(duration: 0.18), value: isSelected)
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
        FlatOption(label: current?.name ?? "Sin grupo",
                   isSelected: current != nil,
                   tint: Color.tint(current?.color ?? "#7a8fa6"),
                   trailingIcon: "chevron.down",
                   dot: Color.tint(current?.color ?? "#7a8fa6")) {
            picking = true
        }
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
