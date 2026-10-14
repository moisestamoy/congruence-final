import SwiftUI

// MARK: - El menú de grupos

/// Lo que abre el chip de grupo: un buscador arriba y la lista debajo.
/// Escribir filtra; Enter elige el primero o, si no hay ninguno, crea el
/// grupo con ese nombre. Antes era una hoja entera encima de otra.
struct GroupPopover: View {
    @Binding var groupId: String?
    let onDone: () -> Void
    let onManage: () -> Void

    @Environment(TaskStore.self) private var store
    @State private var query = ""
    @FocusState private var searching: Bool

    private var trimmed: String { query.trimmingCharacters(in: .whitespaces) }

    private var matches: [TaskGroup] {
        let q = TaskStore.fold(trimmed)
        guard !q.isEmpty else { return store.document.groups }
        return store.document.groups.filter { TaskStore.fold($0.name).contains(q) }
    }

    private var exact: Bool {
        store.document.groups.contains { TaskStore.fold($0.name) == TaskStore.fold(trimmed) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 7) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Palette.textFaint)
                TextField("", text: $query, prompt: Text("Buscar o crear grupo"))
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.text)
                    .focused($searching)
                    .onSubmit(submit)
            }
            .padding(.horizontal, 12)
            .frame(height: 38)

            Divider().overlay(Palette.hairlineFaint)

            ScrollView {
                VStack(alignment: .leading, spacing: 1) {
                    if trimmed.isEmpty {
                        row(name: "Sin grupo", color: "#7a8fa6", selected: groupId == nil,
                            first: false) { pick(nil) }
                    }
                    ForEach(Array(matches.enumerated()), id: \.element.id) { i, g in
                        row(name: g.name, color: g.color, selected: groupId == g.id,
                            first: i == 0 && !trimmed.isEmpty) { pick(g.id) }
                    }
                    if !trimmed.isEmpty && !exact {
                        Button(action: create) {
                            HStack(spacing: 8) {
                                Image(systemName: "plus")
                                    .font(.system(size: 9, weight: .bold))
                                Text("Crear “\(trimmed)”")
                                    .font(.system(size: 13, weight: .semibold))
                                Spacer()
                                if matches.isEmpty { enterHint }
                            }
                            .foregroundStyle(Palette.accent)
                            .padding(.horizontal, 10)
                            .frame(height: 32)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.pressable)
                    }
                }
                .padding(6)
            }
            .frame(maxHeight: 280)
            .fixedSize(horizontal: false, vertical: true)

            Divider().overlay(Palette.hairlineFaint)

            Button(action: onManage) {
                HStack(spacing: 6) {
                    Image(systemName: "pencil").font(.system(size: 9, weight: .semibold))
                    Text("Editar grupos…").font(.system(size: 11, weight: .medium))
                    Spacer()
                }
                .foregroundStyle(Palette.textMuted)
                .padding(.horizontal, 12)
                .frame(height: 32)
                .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
        }
        .frame(width: 260)
        .background(Palette.base)
        .onAppear { searching = true }
    }

    private var enterHint: some View {
        Text("↩")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(Palette.textFaint)
    }

    private func row(name: String, color: String, selected: Bool, first: Bool,
                     action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 9) {
                Circle().fill(Color.tint(color)).frame(width: 7, height: 7)
                Text(name).font(.system(size: 13)).foregroundStyle(Palette.text)
                Spacer()
                if first { enterHint }
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.accent)
                }
            }
            .padding(.horizontal, 10)
            .frame(height: 32)
            .background(selected || first ? Palette.fill(0.05) : .clear,
                        in: RoundedRectangle(cornerRadius: Radius.inner))
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
    }

    private func submit() {
        if trimmed.isEmpty { onDone(); return }
        if let first = matches.first { pick(first.id) } else { create() }
    }

    private func create() {
        let palette = GroupPickerSheet.palette
        guard let id = store.addGroup(name: trimmed,
                                      color: palette[store.document.groups.count % palette.count])
        else { return }
        pick(id)
    }

    private func pick(_ id: String?) {
        groupId = id
        onDone()
    }
}

// MARK: - Los grupos a la vista

/// En el editor los grupos van todos a la vista, uno por botón: elegir uno
/// es un toque, sin abrir nada encima.
struct GroupChips: View {
    @Binding var groupId: String?

    @Environment(TaskStore.self) private var store
    @State private var creating = false
    @State private var newName = ""
    @FocusState private var newFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            FlowLayout(spacing: 6) {
                chip(name: "Sin grupo", color: "#7a8fa6", selected: groupId == nil) { groupId = nil }
                ForEach(store.document.groups) { g in
                    chip(name: g.name, color: g.color, selected: groupId == g.id) { groupId = g.id }
                }
                Button {
                    withAnimation(.smooth(duration: 0.2)) { creating.toggle() }
                    newFocused = creating
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus").font(.system(size: 9, weight: .bold))
                        Text("Nuevo").font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundStyle(Palette.accent)
                    .padding(.horizontal, 11)
                    .frame(height: 28)
                    .background(Capsule().stroke(Palette.accent.opacity(0.35), lineWidth: 1))
                    .contentShape(Capsule())
                }
                .buttonStyle(.pressable)
            }
            if creating {
                DarkField(placeholder: "Nombre del grupo y Enter", text: $newName)
                    .focused($newFocused)
                    .onSubmit(create)
                    .transition(.opacity.combined(with: .offset(y: -4)))
            }
        }
    }

    private func create() {
        let palette = GroupPickerSheet.palette
        guard let id = store.addGroup(name: newName,
                                      color: palette[store.document.groups.count % palette.count])
        else { return }
        groupId = id
        newName = ""
        withAnimation(.smooth(duration: 0.2)) { creating = false }
    }

    private func chip(name: String, color: String, selected: Bool,
                      action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Circle().fill(Color.tint(color)).frame(width: 7, height: 7)
                Text(name)
                    .font(.system(size: 12, weight: selected ? .bold : .medium))
                    .foregroundStyle(selected ? Palette.text : Palette.textMuted)
                    .lineLimit(1)
            }
            .padding(.horizontal, 11)
            .frame(height: 28)
            .background(Capsule().fill(selected ? Color.tint(color).opacity(0.2) : Palette.fill(0.05)))
            .overlay(Capsule().stroke(selected ? Color.tint(color).opacity(0.6) : .clear, lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.pressable)
        .animation(.smooth(duration: 0.15), value: selected)
    }
}

/// Pone las cosas en fila y salta de línea cuando no entran.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let ancho = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, alto: CGFloat = 0, maxX: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > 0 && x + s.width > ancho { x = 0; y += alto + spacing; alto = 0 }
            x += s.width + spacing
            alto = max(alto, s.height)
            maxX = max(maxX, x - spacing)
        }
        return CGSize(width: proposal.width ?? maxX, height: y + alto)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, alto: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x > bounds.minX && x + s.width > bounds.maxX {
                x = bounds.minX; y += alto + spacing; alto = 0
            }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing
            alto = max(alto, s.height)
        }
    }
}
