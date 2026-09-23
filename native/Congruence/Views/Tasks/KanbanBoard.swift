import SwiftUI

/// El tablero: pendiente, en progreso y hecho, con arrastre entre columnas.
///
/// Es la segunda vista de Tareas, no un reemplazo. La lista sigue siendo la
/// que ordena por prioridad de punta a punta; el tablero sirve para mover
/// cosas de estado y ver de un vistazo qué hay empezado.
struct KanbanBoard: View {
    let filterGroupId: String?
    let onlyPriority: Bool
    @Binding var composing: TaskColumn?
    let onEdit: (TodoTask) -> Void
    /// Tocar el vacío de una columna escribe una tarea que nace ahí.
    let onCompose: (TaskColumn) -> Void

    @Environment(TaskStore.self) private var store

    var body: some View {
        ScrollView {
            HStack(alignment: .top, spacing: 16) {
                ForEach(TaskColumn.allCases, id: \.self) { column in
                    KanbanColumn(
                        column: column,
                        tasks: store.column(column, groupId: filterGroupId,
                                            onlyPriority: onlyPriority),
                        composing: $composing,
                        onEdit: onEdit,
                        onCompose: { onCompose(column) }
                    )
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 22)
        }
    }
}

private struct KanbanColumn: View {
    let column: TaskColumn
    let tasks: [TodoTask]
    @Binding var composing: TaskColumn?
    let onEdit: (TodoTask) -> Void
    let onCompose: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var targeted = false

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
                    .foregroundStyle(Palette.textFaint)
                Spacer()
            }
            .padding(.horizontal, 4)

            VStack(spacing: 10) {
                if composing == column {
                    TaskComposer(column: column, composing: $composing, compact: true)
                }

                ForEach(tasks) { task in
                    TaskCard(task: task, group: store.group(task.groupId),
                             muted: column == .done, onEdit: { onEdit(task) })
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
                .stroke(targeted ? accent.opacity(0.45) : Palette.hairlineFaint,
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
    }
}

/// Una tarjeta del tablero. Al hacer clic se abre y deja escribir dentro.
struct TaskCard: View {
    let task: TodoTask
    let group: TaskGroup?
    var muted = false
    let onEdit: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var expanded = false
    @State private var draft = ""
    @State private var hovering = false
    @FocusState private var writing: Bool

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
                notesEditor
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
                    if let deadline = task.deadline {
                        Text(TaskRow.deadlineLabel(deadline))
                            .font(.system(size: 9, weight: .semibold, design: .monospaced))
                            .foregroundStyle(isOverdue ? Palette.negative : Palette.textFaint)
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
            .stroke(hovering ? Palette.hairline : Palette.hairlineFaint, lineWidth: 1))
        .shadow(color: Palette.cardShadowSoft, radius: hovering ? 6 : 2, y: 1)
        .contentShape(RoundedRectangle(cornerRadius: 10))
        .onHover { hovering = $0 }
        .onTapGesture { toggleExpanded() }
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
        if expanded {
            closeNotes()
        } else {
            draft = task.notes
            withAnimation(.smooth(duration: 0.22)) { expanded = true }
            writing = true
        }
    }

    private func closeNotes() {
        store.setNotes(draft.trimmingCharacters(in: .whitespacesAndNewlines), for: task.id)
        withAnimation(.smooth(duration: 0.22)) { expanded = false }
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
