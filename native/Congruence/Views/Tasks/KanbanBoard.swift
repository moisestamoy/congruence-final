import SwiftUI

/// El tablero: pendiente, en progreso y hecho, con arrastre entre columnas.
///
/// Es la segunda vista de Tareas, no un reemplazo. La lista sigue siendo la
/// que ordena por prioridad de punta a punta; el tablero sirve para mover
/// cosas de estado y ver de un vistazo qué hay empezado.
struct KanbanBoard: View {
    let filterGroupId: String?
    let onlyPriority: Bool
    var query: String = ""
    @Binding var composing: TaskColumn?
    /// La tarjeta abierta, si hay alguna. Vive acá arriba para que sólo haya
    /// una abierta y para que un clic fuera pueda cerrarla.
    @Binding var openTask: String?
    @Binding var selected: String?
    let onEdit: (TodoTask) -> Void
    /// Tocar el vacío de una columna escribe una tarea que nace ahí.
    let onCompose: (TaskColumn) -> Void

    @Environment(TaskStore.self) private var store

    var body: some View {
        ScrollView {
            ZStack(alignment: .top) {
                // Todo lo que no es columna cierra lo que estés escribiendo.
                // Va como botón y no como gesto sobre un `Color.clear`: dentro
                // de un ScrollView el gesto no llegaba.
                Button {
                    withAnimation(.smooth(duration: 0.2)) {
                        composing = nil
                        openTask = nil
                    }
                } label: {
                    Color.clear.contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(composing == nil && openTask == nil)

            HStack(alignment: .top, spacing: 16) {
                ForEach(TaskColumn.allCases, id: \.self) { column in
                    KanbanColumn(
                        column: column,
                        tasks: store.column(column, groupId: filterGroupId,
                                            onlyPriority: onlyPriority, query: query),
                        composing: $composing,
                        openTask: $openTask,
                        selected: $selected,
                        onEdit: onEdit,
                        onCompose: { onCompose(column) }
                    )
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 22)
            }
            .frame(maxWidth: .infinity, minHeight: 640, alignment: .top)
        }
        // El tablero se maneja con el teclado: flechas para moverte, con ⌘
        // para mover la tarjeta, Enter para abrirla. Vivir todo el día en el
        // Mac y tener que arrastrar cada cosa con el ratón es lento.
        .focusable()
        .focusEffectDisabled()
        .onKeyPress { tecla in handle(tecla) }
    }

    // MARK: - Teclado

    private func tasks(_ column: TaskColumn) -> [TodoTask] {
        store.column(column, groupId: filterGroupId, onlyPriority: onlyPriority, query: query)
    }

    /// Dónde está la selección: columna y posición.
    private var cursor: (column: TaskColumn, index: Int)? {
        guard let selected else { return nil }
        for columna in TaskColumn.allCases {
            if let i = tasks(columna).firstIndex(where: { $0.id == selected }) {
                return (columna, i)
            }
        }
        return nil
    }

    private func handle(_ press: KeyPress) -> KeyPress.Result {
        let manda = press.modifiers.contains(.command)

        // Sin nada elegido, la primera flecha elige la primera tarjeta que haya.
        guard let (columna, i) = cursor else {
            guard [.upArrow, .downArrow, .leftArrow, .rightArrow].contains(press.key) else {
                return .ignored
            }
            selected = TaskColumn.allCases.compactMap { tasks($0).first?.id }.first
            return .handled
        }
        let lista = tasks(columna)

        switch press.key {
        case .upArrow, .downArrow:
            let paso = press.key == .upArrow ? -1 : 1
            if manda {
                // Mover la tarjeta, no la selección.
                let destino = i + paso
                guard lista.indices.contains(destino) else { return .handled }
                withAnimation(.smooth(duration: 0.25)) {
                    store.reorder(lista[i].id,
                                  before: paso < 0 ? lista[destino].id
                                        : lista.indices.contains(destino + 1) ? lista[destino + 1].id : nil,
                                  in: columna)
                }
            } else if lista.indices.contains(i + paso) {
                selected = lista[i + paso].id
            }
            return .handled

        case .leftArrow, .rightArrow:
            let paso = press.key == .leftArrow ? -1 : 1
            guard let actual = TaskColumn.allCases.firstIndex(of: columna),
                  TaskColumn.allCases.indices.contains(actual + paso) else { return .handled }
            let destino = TaskColumn.allCases[actual + paso]
            if manda {
                if destino == .done {
                    SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
                } else if lista[i].completed {
                    SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                }
                withAnimation(.smooth(duration: 0.3)) {
                    store.setColumn(destino, for: lista[i].id, before: tasks(destino).first?.id)
                }
            } else {
                let vecina = tasks(destino)
                selected = vecina.isEmpty ? selected : vecina[min(i, vecina.count - 1)].id
            }
            return .handled

        case .return:
            withAnimation(.smooth(duration: 0.22)) {
                openTask = openTask == lista[i].id ? nil : lista[i].id
            }
            return .handled

        case .escape:
            selected = nil
            openTask = nil
            return .handled

        default:
            return .ignored
        }
    }
}

private struct KanbanColumn: View {
    let column: TaskColumn
    let tasks: [TodoTask]
    @Binding var composing: TaskColumn?
    @Binding var openTask: String?
    @Binding var selected: String?
    let onEdit: (TodoTask) -> Void
    let onCompose: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var targeted = false
    @State private var confirmingClear = false

    /// El límite de lo que de verdad puede estar en curso a la vez.
    private static let wipLimit = 3

    private var overloaded: Bool {
        column == .doing && tasks.count > Self.wipLimit
    }

    private var accent: Color {
        switch column {
        case .pending: return Palette.textFaint
        case .doing:   return Palette.accent
        case .done:    return Palette.positive
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 7) {
                Circle().fill(accent).frame(width: 5, height: 5)
                Text(column.label).microLabelStyle(Palette.textMuted, size: 9)
                Text("\(tasks.count)")
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .foregroundStyle(overloaded ? Palette.warning : Palette.textFaint)
                if overloaded {
                    // No es un bloqueo: es que ocho cosas "en progreso" son
                    // cero cosas en progreso, y esta app se llama Congruence.
                    Text("· demasiadas a la vez")
                        .font(.system(size: 9))
                        .foregroundStyle(Palette.warning.opacity(0.75))
                }
                Spacer()
                if column == .done, !tasks.isEmpty {
                    Button("Limpiar") { confirmingClear = true }
                        .buttonStyle(.plain)
                        .font(.system(size: 9, weight: .bold))
                        .tracking(0.8)
                        .textCase(.uppercase)
                        .foregroundStyle(Palette.textFaint)
                        .help("Borrar las tareas completadas")
                }
            }
            .padding(.horizontal, 4)

            VStack(spacing: 10) {
                if composing == column {
                    TaskComposer(column: column, composing: $composing, compact: true)
                }

                ForEach(tasks) { task in
                    TaskCard(task: task, group: store.group(task.groupId),
                             openTask: $openTask,
                             selected: $selected,
                             muted: column == .done,
                             column: column,
                             onEdit: { onEdit(task) })
                }

                if tasks.isEmpty && composing != column {
                    Button(action: onCompose) {
                        Text(column == .done ? "Nada terminado hoy" : "Vacío")
                            .font(.system(size: 12, weight: .light, design: .serif))
                            .italic()
                            .foregroundStyle(Palette.textFaint.opacity(0.8))
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 130)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .help("Clic para escribir una tarea acá")
                } else if composing != column {
                    // Debajo de las tarjetas también se escribe.
                    Button(action: onCompose) {
                        Color.clear
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .help("Clic para escribir una tarea acá")
                }
            }
        }
        .padding(10)
        // Una columna vacía sigue siendo un blanco al que soltar, así que
        // guarda un alto mínimo; de ahí crece con lo que tenga.
        .frame(maxWidth: .infinity, minHeight: 190, alignment: .top)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(targeted ? accent.opacity(0.09) : Palette.fill(0.045))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(targeted ? accent.opacity(0.45)
                        : overloaded ? Palette.warning.opacity(0.3) : Palette.hairlineFaint,
                        lineWidth: targeted ? 1.5 : 1)
        )
        .animation(.smooth(duration: 0.18), value: targeted)
        .dropDestination(for: String.self) { ids, _ in
            guard let id = ids.first else { return false }
            if column == .done {
                SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
            } else if store.document.tasks.first(where: { $0.id == id })?.completed == true {
                // Sacar algo de "Hecho" es deshacer: el mismo pop que en la lista.
                SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
            }
            withAnimation(.smooth(duration: 0.32)) {
                store.setColumn(column, for: id)
            }
            return true
        } isTargeted: { targeted = $0 }
        .confirmationDialog(clearPrompt, isPresented: $confirmingClear, titleVisibility: .visible) {
            Button("Borrar", role: .destructive) {
                SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                withAnimation(.smooth(duration: 0.3)) { store.clearCompleted() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Se borran para siempre, no sólo de esta columna.")
        }
    }

    /// Limpiar borra TODAS las completadas, no sólo las de hoy: las viejas son
    /// las que se acumulan sin que las veas. El aviso lo dice con números.
    private var clearPrompt: String {
        let total = store.document.tasks.filter(\.completed).count
        let hoy = tasks.count
        return total == hoy
            ? "¿Borrar \(hoy) tarea\(hoy == 1 ? "" : "s") completada\(hoy == 1 ? "" : "s")?"
            : "¿Borrar \(total) completadas? \(hoy) son de hoy."
    }
}

/// Una tarjeta del tablero. Al hacer clic se abre y deja escribir dentro.
struct TaskCard: View {
    let task: TodoTask
    let group: TaskGroup?
    @Binding var openTask: String?
    @Binding var selected: String?
    var muted = false
    /// La columna en la que vive, para poder recolocar lo que le suelten.
    var column: TaskColumn = .pending
    let onEdit: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var draft = ""
    @State private var hovering = false
    /// Algo viene cayendo justo encima: se abre hueco arriba.
    @State private var dropAbove = false
    @FocusState private var writing: Bool

    private var expanded: Bool { openTask == task.id }
    private var isSelected: Bool { selected == task.id }

    /// De dónde salió, si salió del diario.
    private var originLine: String? {
        guard let id = task.fromNote,
              let nota = store.document.notes.first(where: { $0.id == id })
        else { return nil }
        return "De tu nota del \(DateFormatter.es("d 'de' MMMM").string(from: nota.date))"
    }

    private var accent: Color {
        task.priority == .high ? Palette.negative
            : task.priority == .medium ? Palette.warning : Palette.accent
    }

    private var isOverdue: Bool {
        guard let d = task.deadline, !task.completed else { return false }
        return d < HabitDay.key(HabitDay.current())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(task.text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(muted ? Palette.textFaint : Palette.text)
                .strikethrough(muted, color: Palette.textFaint)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            if expanded {
                if let origen = originLine {
                    Text(origen)
                        .font(.system(size: 10, design: .serif))
                        .italic()
                        .foregroundStyle(Palette.textFaint)
                }
                notesEditor
                Divider().overlay(Palette.hairlineFaint)
                TaskOptionsRow(task: task)
            } else if !task.notes.isEmpty {
                Text(task.notes)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textFaint)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if group != nil || task.deadline != nil || task.priority != .normal {
                HStack(spacing: 6) {
                    if let group {
                        GroupTag(group: group).opacity(muted ? 0.65 : 1)
                    }
                    if task.priority != .normal {
                        Text(task.priority.rawValue)
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle((task.priority == .high ? Palette.negative : Palette.warning)
                                .opacity(muted ? 0.5 : 1))
                    }
                    Spacer(minLength: 4)
                    if let deadline = task.deadline, !muted {
                        DeadlineChip(deadline: deadline)
                    }
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(muted ? Palette.nested : Palette.surfaceRaised,
                    in: RoundedRectangle(cornerRadius: 10))
        .overlay(alignment: .leading) {
            // La barra de prioridad, en el borde de la tarjeta.
            if task.priority != .normal {
                UnevenRoundedRectangle(topLeadingRadius: 10, bottomLeadingRadius: 10)
                    .fill((task.priority == .high ? Palette.negative : Palette.warning)
                        .opacity(muted ? 0.4 : 1))
                    .frame(width: 3)
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 10)
            .stroke(isSelected ? Palette.accent.opacity(0.7)
                    : hovering ? Palette.hairline : Palette.hairlineFaint,
                    lineWidth: isSelected ? 1.5 : 1))
        .shadow(color: Palette.cardShadowSoft, radius: hovering ? 6 : 2, y: 1)
        .overlay(alignment: .top) {
            // La línea marca dónde va a caer, que es lo único que hace falta
            // saber mientras arrastras.
            if dropAbove {
                Capsule().fill(Palette.accent)
                    .frame(height: 3)
                    .offset(y: -6)
            }
        }
        .dropDestination(for: String.self) { ids, _ in
            guard let arrastrada = ids.first, arrastrada != task.id else { return false }
            withAnimation(.smooth(duration: 0.28)) {
                if store.document.tasks.first(where: { $0.id == arrastrada })?.column == column {
                    store.reorder(arrastrada, before: task.id, in: column)
                } else {
                    if column == .done {
                        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
                    }
                    store.setColumn(column, for: arrastrada, before: task.id)
                }
            }
            return true
        } isTargeted: { dropAbove = $0 }
        .animation(.smooth(duration: 0.15), value: dropAbove)
        .contentShape(RoundedRectangle(cornerRadius: 10))
        .onHover { hovering = $0 }
        .onTapGesture { selected = task.id; toggleExpanded() }
        // Se puede cerrar desde fuera (un clic en el fondo, otra tarjeta), así
        // que la nota se guarda al cerrarse, no en el botón.
        .onChange(of: expanded) { _, abierta in
            if abierta {
                draft = task.notes
                writing = true
            } else {
                store.setNotes(draft.trimmingCharacters(in: .whitespacesAndNewlines),
                               for: task.id)
            }
        }
        .contextMenu {
            Button("Editar…", action: onEdit)
            Button(expanded ? "Cerrar nota" : "Escribir dentro") { toggleExpanded() }
            Divider()
            ForEach(TaskColumn.allCases, id: \.self) { c in
                if c != task.column {
                    Button("Mover a \(c.label)") {
                        withAnimation(.smooth(duration: 0.32)) { store.setColumn(c, for: task.id) }
                    }
                }
            }
            Divider()
            Button("Borrar", role: .destructive) {
                SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
                withAnimation(.smooth(duration: 0.25)) { store.removeTask(task.id) }
            }
        }
        .draggable(task.id) {
            // Lo que se ve mientras arrastras: la tarjeta levantada, ya sin
            // el detalle de adentro.
            Text(task.text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.text)
                .lineLimit(2)
                .padding(12)
                .frame(maxWidth: 240, alignment: .leading)
                .background(muted ? Palette.nested : Palette.surfaceRaised,
                    in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(accent.opacity(0.5), lineWidth: 1.5))
        }
        // Entra y sale con una caída corta: al soltarla en Hecho, la tarjeta
        // se encoge y se apaga en lugar de desaparecer de golpe.
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .scale(scale: 0.96)),
            removal: .opacity.combined(with: .scale(scale: 0.92))
        ))
        .animation(.smooth(duration: 0.2), value: hovering)
    }

    private var notesEditor: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topLeading) {
                if draft.isEmpty {
                    Text("Escribe aquí")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint.opacity(0.6))
                        .padding(.top, 6)
                        .padding(.leading, 4)
                        .allowsHitTesting(false)
                }
                TextEditor(text: $draft)
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.text)
                    .scrollContentBackground(.hidden)
                    .focused($writing)
                    .frame(height: 74)
            }
            .padding(.horizontal, 4)
            .background(Palette.inputBackground, in: RoundedRectangle(cornerRadius: 7))
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(Palette.hairlineFaint, lineWidth: 1))

            HStack(spacing: 10) {
                Spacer()
                Button("Listo") { closeNotes() }
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Palette.accent)
            }
        }
    }

    private func toggleExpanded() {
        withAnimation(.smooth(duration: 0.22)) {
            openTask = expanded ? nil : task.id
        }
    }

    private func closeNotes() {
        withAnimation(.smooth(duration: 0.22)) { openTask = nil }
    }
}

/// La etiqueta del grupo al que pertenece la tarea.
struct GroupTag: View {
    let group: TaskGroup

    var body: some View {
        let tint = Color.tint(group.color)
        HStack(spacing: 4) {
            Circle().fill(tint).frame(width: 4, height: 4)
            Text(group.name)
                .font(.system(size: 9, weight: .bold))
                .tracking(0.4)
                .lineLimit(1)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 6)
        .frame(height: 17)
        .background(Capsule().fill(tint.opacity(0.11)))
    }
}


/// Los mismos ajustes que al crear una tarea, pero sobre una que ya existe.
/// Viven dentro de la tarjeta abierta: si la abriste para escribirle, también
/// vas a querer marcarla o moverla de grupo sin abrir otra cosa.
struct TaskOptionsRow: View {
    let task: TodoTask

    @Environment(TaskStore.self) private var store

    private var deadline: Binding<Date?> {
        Binding(
            get: { task.deadline.map(FinDate.date) },
            set: { nueva in
                store.modify(task.id) { $0.deadline = nueva.map(HabitDay.key) }
            }
        )
    }

    private var groupId: Binding<String?> {
        Binding(
            get: { task.groupId },
            set: { nuevo in store.modify(task.id) { $0.groupId = nuevo } }
        )
    }

    var body: some View {
        HStack(spacing: 4) {
            Spacer(minLength: 0)
            ForEach(TaskPriority.allCases, id: \.self) { p in
                FlatOption(label: p == .normal ? "Normal" : p.rawValue,
                           isSelected: task.priority == p,
                           tint: p == .high ? Palette.negative
                               : p == .medium ? Palette.warning : Palette.accent) {
                    store.modify(task.id) { $0.priority = p }
                }
            }
            Rectangle().fill(Palette.hairlineFaint)
                .frame(width: 1, height: 14)
                .padding(.horizontal, 4)
            DeadlineField(date: deadline)
            GroupPicker(groupId: groupId, groups: store.document.groups)
            Spacer(minLength: 0)
        }
        .frame(height: 34)
    }
}


/// La fecha de una tarea, legible de un vistazo. Antes era texto gris del
/// mismo peso que todo lo demás, y en un tablero "vence hoy" y "vencida"
/// tienen que gritar.
struct DeadlineChip: View {
    let deadline: String

    private enum Urgency { case overdue, today, tomorrow, later }

    private var urgency: Urgency {
        let hoy = HabitDay.key(HabitDay.current())
        let mañana = HabitDay.key(HabitDay.adding(1, to: HabitDay.current()))
        if deadline < hoy { return .overdue }
        if deadline == hoy { return .today }
        if deadline == mañana { return .tomorrow }
        return .later
    }

    private var label: String {
        switch urgency {
        case .overdue:  return "Vencida"
        case .today:    return "Hoy"
        case .tomorrow: return "Mañana"
        case .later:    return DateFormatter.es("d MMM").string(from: FinDate.date(deadline))
        }
    }

    private var tint: Color {
        switch urgency {
        case .overdue:  return Palette.negative
        case .today:    return Palette.warning
        case .tomorrow: return Palette.accent
        case .later:    return Palette.textFaint
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 9, weight: .bold))
            .tracking(0.4)
            .textCase(.uppercase)
            .foregroundStyle(urgency == .later ? Palette.textFaint : tint)
            .padding(.horizontal, 6)
            .frame(height: 17)
            .background(
                Capsule().fill(urgency == .later ? .clear : tint.opacity(0.13))
            )
            .help(DateFormatter.es("EEEE d 'de' MMMM").string(from: FinDate.date(deadline)))
    }
}
