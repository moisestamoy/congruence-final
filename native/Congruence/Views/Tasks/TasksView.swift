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
    @Environment(\.isCompact) private var isCompact

    @State private var tab: Tab = .tareas
    @State private var filterGroupId: String?
    @State private var onlyPriority = false
    @State private var showingDoneToday = false
    /// Lista o tablero. Es una segunda vista de lo mismo, no otra sección.
    @AppStorage("tasksLayout") private var layoutRaw = TaskLayout.list.rawValue
    /// El día que estás mirando en el Diario.
    @State private var diaryDay = HabitDay.current()
    /// Sube cada vez que algo pide escribir una nota; el compositor lo mira
    /// para tomar el foco.
    @State private var noteFocusToken = 0
    /// La columna que está escribiendo ahora mismo, o ninguna. El campo no
    /// vive en la pantalla: aparece donde haces clic y se va al terminar.
    @State private var composing: TaskColumn?
    /// La tarjeta o fila abierta. Sólo una a la vez, y un clic fuera la cierra.
    @State private var openTask: String?
    @State private var query = ""
    /// La tarjeta elegida con el teclado.
    @State private var selected: String?
    @FocusState private var searching: Bool
    /// Grupos plegados, separados por coma. Se guarda para que al volver a
    /// abrir la app siga plegado lo que plegaste.
    @AppStorage("tasksCollapsedGroups") private var collapsedRaw = ""
    @State private var editing: TodoTask?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            tabs
            Divider().overlay(Palette.hairlineFaint)

            if tab == .tareas && layout == .board {
                // El tablero se queda con todo el ancho: tres columnas en 672
                // puntos serían tres cintas.
                VStack(alignment: .leading, spacing: 0) {
                    boardControls
                    KanbanBoard(filterGroupId: filterGroupId,
                                onlyPriority: onlyPriority,
                                query: query,
                                composing: $composing,
                                openTask: $openTask,
                                selected: $selected,
                                onEdit: { editing = $0 },
                                onCompose: { compose($0) })
                }
            } else {
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
                    .padding(.horizontal, sideMargin)
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .sheet(item: $editing) { task in
            TaskEditorSheet(task: task)
        }
        .background {
            Button("") { tab = .tareas; compose(.pending) }
                .keyboardShortcut("n", modifiers: .command)
                .opacity(0)
            Button("") { tab = .tareas; searching = true }
                .keyboardShortcut("f", modifiers: .command)
                .opacity(0)
        }
    }

    // MARK: - Encabezado

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(DateFormatter.es("EEEE, d 'de' MMMM 'de' yyyy").string(from: Date()).sentenceCased)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            HStack(alignment: .firstTextBaseline) {
                Text("Tareas")
                    .font(.system(size: isCompact ? 30 : 34, weight: .black))
                    .tracking(-0.8)
                    .foregroundStyle(Palette.text)
                Spacer()
                layoutSwitch
                    .opacity(tab == .tareas ? 1 : 0)
                    .disabled(tab != .tareas)
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
        .padding(.horizontal, sideMargin)
        .frame(maxWidth: .infinity)
        .padding(.top, isCompact ? 16 : 28)
        .padding(.bottom, 18)
    }

    private var layout: TaskLayout { TaskLayout(rawValue: layoutRaw) ?? .list }

    /// El margen a los lados. En la Mac la columna de 672 ya queda centrada
    /// con aire; en el teléfono sin esto el texto tocaría el borde.
    private var sideMargin: CGFloat { isCompact ? 18 : 28 }

    /// Lista o tablero. Dos iconos, no dos palabras: es un cambio de forma,
    /// no una sección nueva.
    private var layoutSwitch: some View {
        HStack(spacing: 2) {
            ForEach(TaskLayout.allCases, id: \.self) { option in
                Button {
                    withAnimation(.smooth(duration: 0.25)) { layoutRaw = option.rawValue }
                } label: {
                    Image(systemName: option.symbol)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(layout == option ? Palette.accent : Palette.textFaint)
                        .frame(width: 26, height: 22)
                        .background(
                            RoundedRectangle(cornerRadius: 6)
                                .fill(layout == option ? Palette.accent.opacity(0.11) : .clear)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help(option.label)
            }
        }
        .padding(2)
        .background(Capsule().fill(Palette.fill(0.03)))
        .animation(.smooth(duration: 0.2), value: layout)
    }

    /// Arriba del tablero van el campo de escribir y los filtros, igual que
    /// en la lista: cambiar de vista no debería cambiar dónde se crea algo.
    private var boardControls: some View {
        Group {
            if !store.document.groups.isEmpty { filters }
        }
        .padding(.horizontal, isCompact ? 16 : 28)
        .padding(.top, isCompact ? 12 : 20)
        .padding(.bottom, 4)
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
        .padding(.horizontal, sideMargin)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Tareas

    private var tareasView: some View {
        VStack(alignment: .leading, spacing: 18) {
            if !store.document.groups.isEmpty { filters }

            if composing != nil {
                TaskComposer(column: composing ?? .pending, composing: $composing)
            }

            let groups = store.grouped(groupId: filterGroupId, onlyPriority: onlyPriority,
                                       query: query)
            if groups.isEmpty {
                empty("Nada pendiente. Disfrútalo.") { compose(.pending) }
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
                                        openTask: $openTask,
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
                blankCatcher
            }
        }
    }

    /// El espacio de debajo de la lista también escribe. Sin esto, con tareas
    /// en pantalla no quedaría ningún sitio en blanco donde hacer clic.
    private var blankCatcher: some View {
        Button {
            if openTask != nil {
                withAnimation(.smooth(duration: 0.2)) { openTask = nil }
            } else {
                compose(.pending)
            }
        } label: {
            Color.clear
                .frame(maxWidth: .infinity)
                .frame(height: 220)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help("Clic para escribir una tarea")
    }

    /// Un clic en blanco abre el campo; otro clic en blanco lo cierra. Si ya
    /// estabas escribiendo en otra columna, lo mueve a ésta.
    private func compose(_ column: TaskColumn) {
        withAnimation(.smooth(duration: 0.2)) {
            composing = composing == column ? nil : column
        }
    }

    /// El pie cuenta lo pendiente y, si completaste algo hoy, deja verlo y
    /// deshacerlo: al completar una tarea desaparece, y sin esto un clic sin
    /// querer no tenía vuelta atrás.
    private var footer: some View {
        let pending = store.pending(groupId: filterGroupId, onlyPriority: onlyPriority,
                                    query: query).count
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
    private func isCollapsed(_ key: String) -> Bool {
        collapsedRaw.split(separator: ",").contains(Substring(key))
    }

    private func toggleCollapsed(_ key: String) {
        var keys = collapsedRaw.split(separator: ",").map(String.init)
        if let i = keys.firstIndex(of: key) { keys.remove(at: i) } else { keys.append(key) }
        withAnimation(.smooth(duration: 0.2)) { collapsedRaw = keys.joined(separator: ",") }
    }

    /// Los filtros hablan el idioma de las pestañas de arriba — etiqueta
    /// chica en mayúsculas, sin cápsula — para que no compitan con la
    /// tarjeta de escribir, que es lo único con forma de control acá.
    @ViewBuilder
    private var filters: some View {
        if isCompact {
            // En el teléfono los filtros se deslizan y el buscador va aparte:
            // en una sola fila no entraban ni la mitad.
            VStack(alignment: .leading, spacing: 10) {
                searchField
                ScrollView(.horizontal) {
                    filterLabels.padding(.horizontal, 2)
                }
                .scrollIndicators(.hidden)
            }
        } else {
            HStack(spacing: 16) {
                filterLabels
                Spacer()
                searchField
            }
            .padding(.horizontal, 2)
        }
    }

    private var filterLabels: some View {
        HStack(spacing: 16) {
            FilterLabel(text: "Todo", isSelected: filterGroupId == nil && !onlyPriority,
                        tint: Palette.text) {
                filterGroupId = nil; onlyPriority = false
            }
            .opacity(query.isEmpty ? 1 : 0.4)
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
        }
    }

    /// Buscar en el texto, en la nota de dentro y en el nombre del grupo.
    private var searchField: some View {
        HStack(spacing: 6) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(searching || !query.isEmpty ? Palette.accent : Palette.textFaint)
            ZStack(alignment: .leading) {
                if query.isEmpty {
                    Text("Buscar")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint.opacity(0.8))
                        .allowsHitTesting(false)
                }
                TextField("", text: $query)
                    .textFieldStyle(.plain)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.text)
                    .focused($searching)
            }
            .frame(width: isCompact ? nil : 120)
            .frame(maxWidth: isCompact ? .infinity : nil)
            if !query.isEmpty {
                Button { query = "" } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(Palette.textFaint)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 9)
        .frame(height: isCompact ? 34 : 26)
        .background(Capsule().fill(Palette.fill(searching ? 0.07 : 0.04)))
        .overlay(Capsule().stroke(searching ? Palette.accent.opacity(0.35)
                                            : Palette.hairlineFaint, lineWidth: 1))
        .animation(.smooth(duration: 0.18), value: searching)
        .onEscape { query = ""; searching = false }
    }

    // MARK: - Hoy

    private var hoyView: some View {
        let list = store.dueToday()
        return VStack(alignment: .leading, spacing: 2) {
            if list.isEmpty {
                empty("Nada por hoy · descansa") {
                    withAnimation(.smooth(duration: 0.2)) { tab = .tareas }
                    compose(.pending)
                }
            } else {
                ForEach(list) { task in
                    TaskRow(task: task, group: store.group(task.groupId),
                            sound: store.document.soundEnabled,
                            openTask: $openTask,
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
        let notes = store.notes(on: diaryDay)
        return VStack(alignment: .leading, spacing: 12) {
            diaryHeader

            NoteComposer(day: diaryDay, focusToken: noteFocusToken)

            if notes.isEmpty {
                VStack(spacing: 10) {
                    empty(isToday ? "Nada todavía." : "Ese día no quedó nada escrito.") {
                        noteFocusToken += 1
                    }
                    // Ir de a un día hasta la última nota pueden ser cien
                    // clics, así que el día vacío ofrece el salto.
                    if let anterior = previousDayWithNotes {
                        Button {
                            withAnimation(.smooth(duration: 0.25)) { diaryDay = anterior }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: "arrow.uturn.backward")
                                    .font(.system(size: 9, weight: .bold))
                                Text("Ir al \(DateFormatter.es("d 'de' MMMM").string(from: anterior))")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(Palette.accent)
                            .padding(.horizontal, 12)
                            .frame(height: 26)
                            .background(Capsule().fill(Palette.accent.opacity(0.09)))
                            .contentShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .frame(maxWidth: .infinity)
            } else {
                ForEach(notes) { note in
                    NoteCard(note: note)
                }
            }
        }
        .animation(.smooth(duration: 0.22), value: HabitDay.key(diaryDay))
    }

    /// El día anterior más cercano que sí tenga algo escrito.
    private var previousDayWithNotes: Date? {
        let actual = HabitDay.key(diaryDay)
        return store.daysWithNotes().first { HabitDay.key($0) < actual }
    }

    private var isToday: Bool {
        HabitDay.key(diaryDay) == HabitDay.key(HabitDay.current())
    }

    /// El diario va por día. Antes era una pila plana de notas sin tiempo, y
    /// un diario sin días no es un diario: es un cajón.
    private var diaryHeader: some View {
        HStack(spacing: 10) {
            Text(dayLabel)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Palette.text)
                + Text(isToday ? ", \(DateFormatter.es("d 'de' MMMM").string(from: diaryDay))" : "")
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(Palette.textFaint)

            Spacer()

            if !isToday {
                Button("Hoy") { withAnimation { diaryDay = HabitDay.current() } }
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.accent)
                    .padding(.horizontal, 10)
                    .frame(height: 24)
                    .background(Capsule().fill(Palette.accent.opacity(0.1)))
            }

            dayStep(-1, "chevron.left")
            dayStep(1, "chevron.right")
                .disabled(isToday)
                .opacity(isToday ? 0.3 : 1)
        }
        .padding(.bottom, 2)
    }

    private var dayLabel: String {
        if isToday { return "Hoy" }
        let ayer = HabitDay.key(HabitDay.adding(-1, to: HabitDay.current()))
        if HabitDay.key(diaryDay) == ayer { return "Ayer" }
        return DateFormatter.es("EEEE d 'de' MMMM").string(from: diaryDay).sentenceCased
    }

    private func dayStep(_ offset: Int, _ symbol: String) -> some View {
        Button {
            withAnimation(.smooth(duration: 0.22)) {
                diaryDay = HabitDay.adding(offset, to: diaryDay)
            }
        } label: {
            Image(systemName: symbol)
                .font(.system(size: 10, weight: .bold))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 26, height: 24)
                .background(Capsule().fill(Palette.fill(0.045)))
                .overlay(Capsule().stroke(Palette.hairlineFaint, lineWidth: 1))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    /// El vacío es el sitio más grande de la pantalla, y hasta ahora no hacía
    /// nada. Un clic ahí empieza a escribir, que es lo único que se puede
    /// querer hacer cuando no hay nada.
    private func empty(_ text: String, action: (() -> Void)? = nil) -> some View {
        Button { action?() } label: {
            Text(text)
                .font(.system(size: 17, weight: .light, design: .serif))
                .italic()
                .foregroundStyle(Palette.textFaint)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 200)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
        .help(action == nil ? "" : "Clic para escribir")
    }
}

// MARK: - Una tarea

struct TaskRow: View {
    let task: TodoTask
    let group: TaskGroup?
    let sound: Bool
    @Binding var openTask: String?
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var hovering = false
    @State private var draft = ""
    @FocusState private var writing: Bool
    /// Al completar, la tarea desaparece de la lista. Este instante deja ver
    /// el círculo llenarse antes de que se vaya; sin él el clic no tiene
    /// respuesta, sólo una fila que se esfuma.
    @State private var completing = false

    /// Abierta para escribir dentro, igual que una tarjeta del tablero.
    private var expanded: Bool { openTask == task.id }

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
        VStack(alignment: .leading, spacing: 0) {
            row
            if expanded {
                VStack(alignment: .leading, spacing: 8) {
                    notesEditor
                    SubtaskList(task: task)
                    Divider().overlay(Palette.hairlineFaint)
                    TaskOptionsRow(task: task)
                }
                .padding(.leading, 39).padding(.trailing, 10).padding(.bottom, 10)
            } else if !task.notes.isEmpty {
                Text(task.notes)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textFaint)
                    .lineLimit(2)
                    .padding(.leading, 39)
                    .padding(.trailing, 10)
                    .padding(.bottom, 9)
            }
        }
        .background(hovering || expanded ? Palette.fill(0.035) : .clear,
                    in: RoundedRectangle(cornerRadius: 8))
        .onHover { hovering = $0 }
        // Puede cerrarse desde fuera, así que la nota se guarda al cerrarse.
        .onChange(of: expanded) { _, abierta in
            if abierta {
                draft = task.notes
                writing = true
            } else {
                store.setNotes(draft.trimmingCharacters(in: .whitespacesAndNewlines),
                               for: task.id)
            }
        }
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .offset(y: -6)),
            removal: .opacity.combined(with: .offset(x: 30))
        ))
    }

    private var notesEditor: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topLeading) {
                if draft.isEmpty {
                    Text("Escribe aquí")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint.opacity(0.6))
                        .padding(.top, 6).padding(.leading, 4)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $draft)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.text)
                    .scrollContentBackground(.hidden)
                    .focused($writing)
                    .frame(height: 70)
            }
            .padding(.horizontal, 4)
            .background(Palette.inputBackground, in: RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Palette.hairlineFaint, lineWidth: 1))

            HStack {
                Spacer()
                Button("Listo") { closeNotes() }
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.accent)
            }
        }
    }

    private func toggleExpanded() {
        withAnimation(.smooth(duration: 0.22)) { openTask = expanded ? nil : task.id }
    }

    private func closeNotes() {
        withAnimation(.smooth(duration: 0.22)) { openTask = nil }
    }

    private var row: some View {
        HStack(spacing: 12) {
            Button(action: complete) {
                ZStack {
                    Circle()
                        .stroke(completing ? accent
                                : task.inProgress ? Palette.accent.opacity(0.7)
                                : Palette.hairline,
                                lineWidth: 1.5)
                        .frame(width: 17, height: 17)
                    // Empezada: el círculo lleva un punto adentro. En la lista
                    // una tarea en progreso se veía igual que una sin tocar.
                    if task.inProgress && !completing {
                        Circle()
                            .fill(Palette.accent.opacity(0.7))
                            .frame(width: 7, height: 7)
                    }
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

            if !task.subtasks.isEmpty && !expanded {
                SubtaskProgress(subtasks: task.subtasks)
            }
            if let deadline = task.deadline {
                DeadlineChip(deadline: deadline)
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
        .contentShape(Rectangle())
        // Doble clic abre la hoja de edición; uno solo abre la nota. El de
        // dos va primero o SwiftUI se queda con el de uno.
        .onTapGesture(count: 2, perform: onEdit)
        .onTapGesture { toggleExpanded() }
        .contextMenu {
            Button("Editar…", action: onEdit)
            Button(expanded ? "Cerrar nota" : "Escribir dentro") { toggleExpanded() }
            Button(task.inProgress ? "Marcar como pendiente" : "Marcar en progreso") {
                withAnimation(.smooth(duration: 0.25)) {
                    store.setColumn(task.inProgress ? .pending : .doing, for: task.id)
                }
            }
            Button("Completar", action: complete)
            Divider()
            Button("Borrar", role: .destructive) {
                SoundEffects.shared.play(.pop, enabled: sound)
                withAnimation(.smooth(duration: 0.25)) { onDelete() }
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
    /// El grupo que estás editando ahí mismo, si hay alguno.
    @State private var editing: String?
    @State private var editName = ""
    @State private var editColor = ""

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
                    if editing == g.id {
                        groupEditor(g)
                    } else {
                        row(color: g.color, name: g.name, selected: groupId == g.id,
                            onEdit: {
                                editName = g.name
                                editColor = g.color
                                withAnimation(.smooth(duration: 0.2)) { editing = g.id }
                            }) {
                            groupId = g.id
                            dismiss()
                        }
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
        .sheetWidth(400)
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
                     onEdit: (() -> Void)? = nil,
                     action: @escaping () -> Void) -> some View {
        HStack(spacing: 9) {
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
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            if let onEdit {
                Button(action: onEdit) {
                    Image(systemName: "pencil")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(Palette.textFaint)
                        .frame(width: 20, height: 20)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .help("Cambiar nombre y color")
            }
        }
        .padding(.horizontal, 10)
        .frame(height: 34)
        .background(selected ? Palette.fill(0.04) : .clear,
                    in: RoundedRectangle(cornerRadius: 8))
    }

    /// Editar un grupo donde está, sin abrir otra ventana: nombre, color y
    /// borrarlo.
    private func groupEditor(_ g: TaskGroup) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            DarkField(placeholder: "Nombre", text: $editName)

            HStack(spacing: 10) {
                ForEach(Self.palette, id: \.self) { hex in
                    Button { editColor = hex } label: {
                        Circle()
                            .fill(Color.tint(hex))
                            .frame(width: 16, height: 16)
                            .overlay(
                                Circle()
                                    .stroke(Palette.text, lineWidth: editColor == hex ? 1.5 : 0)
                                    .padding(-3)
                            )
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }

            HStack(spacing: 12) {
                Button("Borrar grupo") {
                    withAnimation(.smooth(duration: 0.25)) {
                        store.removeGroup(g.id)
                        editing = nil
                    }
                }
                .buttonStyle(.plain)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(Palette.negative.opacity(0.85))
                Spacer()
                Button("Cancelar") { withAnimation { editing = nil } }
                    .buttonStyle(.plain)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                Button("Guardar") {
                    store.updateGroup(g.id, name: editName, color: editColor)
                    withAnimation { editing = nil }
                }
                .buttonStyle(.plain)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Palette.accent)
            }
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 9).fill(Palette.fill(0.05)))
        .overlay(RoundedRectangle(cornerRadius: 9)
            .stroke(Palette.accent.opacity(0.3), lineWidth: 1))
    }
}

// MARK: - Escribir una tarea

/// El campo para escribir. No vive en la pantalla: aparece donde haces clic y
/// se va al terminar. Una barra de escribir siempre presente ocupa sitio los
/// días en que no escribes nada, que son la mayoría.
struct TaskComposer: View {
    /// La columna en la que nace lo que escribas.
    let column: TaskColumn
    @Binding var composing: TaskColumn?
    /// Dentro de una columna del tablero el espacio es menor.
    var compact = false

    @Environment(TaskStore.self) private var store
    @State private var draft = ""
    @State private var priority: TaskPriority = .normal
    @State private var deadline: Date?
    @State private var groupId: String?
    @FocusState private var focused: Bool
    /// Escape descarta; cerrar de cualquier otra forma guarda.
    @State private var discarding = false

    private var placeholder: String {
        column == .pending ? "Escribe una tarea y pulsa Enter"
                           : "Escribe una tarea para \(column.label)"
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Palette.accent)
                TextField("", text: $draft, prompt: Text(placeholder))
                    .textFieldStyle(.plain)
                    .font(.system(size: compact ? 13 : 14))
                    .foregroundStyle(Palette.text)
                    .focused($focused)
                    .onSubmit(add)
                    .onChange(of: draft) { old, new in
                        // Sólo al escribir, no al vaciarse tras guardar.
                        if new.count > old.count {
                            SoundEffects.shared.play(.key, enabled: store.document.soundEnabled)
                        }
                    }
            }
            .padding(.horizontal, compact ? 11 : 14)
            .frame(height: compact ? 38 : 44)

            Divider().overlay(Palette.hairlineFaint)

            // Centrados: pegados a la izquierda dejaban medio campo vacío.
            HStack(spacing: 4) {
                Spacer(minLength: 0)
                ForEach(TaskPriority.allCases, id: \.self) { p in
                    FlatOption(label: p == .normal ? "Normal" : p.rawValue,
                               isSelected: priority == p,
                               tint: p == .high ? Palette.negative
                                   : p == .medium ? Palette.warning : Palette.accent) {
                        priority = p
                    }
                }
                Rectangle().fill(Palette.hairlineFaint)
                    .frame(width: 1, height: 14)
                    .padding(.horizontal, 4)
                DeadlineField(date: $deadline)
                GroupPicker(groupId: $groupId, groups: store.document.groups)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 6)
            .frame(height: 36)
        }
        .background(RoundedRectangle(cornerRadius: 12).fill(Palette.fill(0.07)))
        .overlay(RoundedRectangle(cornerRadius: 12)
            .stroke(Palette.accent.opacity(0.4), lineWidth: 1))
        .onAppear { focused = true }
        // Al perder el foco con el campo vacío se cierra solo: nada que
        // guardar, nada que dejar abierto.
        .onChange(of: focused) { _, isFocused in
            if !isFocused && draft.trimmingCharacters(in: .whitespaces).isEmpty {
                composing = nil
            }
        }
        .onEscape {
            discarding = true
            composing = nil
        }
        // Cerrar con algo escrito lo guarda. Un clic fuera no debería tirar
        // un texto que escribiste a propósito.
        .onDisappear {
            guard !discarding else { return }
            let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { return }
            store.addTask(text: text, priority: priority,
                          deadline: deadline.map(HabitDay.key),
                          groupId: groupId, column: column)
        }
        .transition(.opacity.combined(with: .offset(y: -6)))
    }

    /// Guarda y se queda abierto: escribir tres tareas seguidas no debería
    /// costar tres clics más.
    private func add() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { composing = nil; return }
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.25)) {
            store.addTask(text: text, priority: priority,
                          deadline: deadline.map(HabitDay.key),
                          groupId: groupId, column: column)
        }
        draft = ""
        priority = .normal
        deadline = nil
        focused = true
    }
}
