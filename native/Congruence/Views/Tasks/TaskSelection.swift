import SwiftUI
#if os(macOS)
import AppKit
#endif

/// Varias tareas elegidas a la vez, para mandarlas juntas a un grupo.
///
/// En la Mac se entra con ⌘-clic (y Mayús-clic elige un tramo); en el
/// teléfono, manteniendo pulsada una tarea → Seleccionar. Mientras hay algo
/// elegido, un toque suma o quita en vez de abrir la tarea, y abajo aparece
/// la barra con los grupos: un toque y todas pasan a ese grupo.
@Observable
final class TaskSelection {
    private(set) var ids: Set<String> = []
    /// Desde dónde cuenta un Mayús-clic.
    @ObservationIgnored private var anchor: String?
    /// Las tareas en el orden en que se ven, para poder elegir un tramo.
    @ObservationIgnored var order: [String] = []

    var isActive: Bool { !ids.isEmpty }

    func contains(_ id: String) -> Bool { ids.contains(id) }

    func toggle(_ id: String) {
        if ids.contains(id) { ids.remove(id) } else { ids.insert(id) }
        anchor = id
    }

    /// Todo lo que hay entre la última elegida y ésta, ambas incluidas.
    func extend(to id: String) {
        guard let anchor, let a = order.firstIndex(of: anchor),
              let b = order.firstIndex(of: id) else { toggle(id); return }
        ids.formUnion(order[min(a, b)...max(a, b)])
    }

    func selectAll() { ids.formUnion(order) }

    func clear() {
        ids = []
        anchor = nil
    }

    /// Lo que hace un toque sobre una tarea. Devuelve `true` si lo usó la
    /// selección; si no, la tarea hace lo de siempre (abrirse).
    func handleTap(_ id: String) -> Bool {
        #if os(macOS)
        let flags = NSEvent.modifierFlags
        if flags.contains(.shift) && isActive { extend(to: id); return true }
        if flags.contains(.command) || flags.contains(.shift) { toggle(id); return true }
        #endif
        guard isActive else { return false }
        toggle(id)
        return true
    }
}

private struct TaskSelectionKey: EnvironmentKey {
    static let defaultValue = TaskSelection()
}

extension EnvironmentValues {
    var taskSelection: TaskSelection {
        get { self[TaskSelectionKey.self] }
        set { self[TaskSelectionKey.self] = newValue }
    }
}

/// La marca de "elegida" que ocupa el lugar del círculo de completar.
struct SelectionMark: View {
    let isOn: Bool

    var body: some View {
        ZStack {
            Circle()
                .stroke(isOn ? Palette.accent : Palette.hairline, lineWidth: 1.5)
            Circle()
                .fill(Palette.accent)
                .scaleEffect(isOn ? 1 : 0.01)
                .opacity(isOn ? 1 : 0)
            Image(systemName: "checkmark")
                .font(.system(size: 8, weight: .black))
                .foregroundStyle(Palette.onAccent)
                .opacity(isOn ? 1 : 0)
        }
        .frame(width: 17, height: 17)
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isOn)
    }
}

/// La barra de abajo mientras hay tareas elegidas: cuántas, y los grupos a
/// los que mandarlas. Un toque en un grupo las mueve todas y la barra se va.
struct SelectionBar: View {
    @Environment(TaskStore.self) private var store
    @Environment(\.taskSelection) private var selection
    @Environment(\.isCompact) private var isCompact

    @State private var creating = false
    /// El grupo que sale de la hoja de crear; al llegar se aplica.
    @State private var newGroupId: String?

    var body: some View {
        let count = selection.ids.count
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Text("\(count)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(Palette.onAccent)
                    .frame(minWidth: 22, minHeight: 22)
                    .background(Circle().fill(Palette.accent))
                    .contentTransition(.numericText())
                Text(count == 1 ? "elegida · ¿a qué grupo?" : "elegidas · ¿a qué grupo?")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                Spacer(minLength: 8)
                Button("Todas") { withAnimation(.smooth(duration: 0.15)) { selection.selectAll() } }
                    .buttonStyle(.pressable)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .keyboardShortcut("a", modifiers: .command)
                Button {
                    withAnimation(.smooth(duration: 0.2)) { selection.clear() }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.textMuted)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Palette.fill(0.06)))
                        .contentShape(Circle())
                }
                .buttonStyle(.pressable)
                .help("Cancelar (Esc)")
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 10)

            ScrollView(.horizontal) {
                HStack(spacing: 6) {
                    ForEach(Array(store.document.groups.enumerated()), id: \.element.id) { i, g in
                        chip(name: g.name, color: g.color, number: i < 9 ? i + 1 : nil) {
                            apply(g.id)
                        }
                    }
                    chip(name: "Sin grupo", color: "#7a8fa6", number: nil) { apply(nil) }
                    Button { creating = true } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus").font(.system(size: 9, weight: .bold))
                            Text("Nuevo").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(Palette.accent)
                        .padding(.horizontal, 11)
                        .frame(height: 30)
                        .background(Capsule().stroke(Palette.accent.opacity(0.35), lineWidth: 1))
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.pressable)
                }
                .padding(.horizontal, 14)
            }
            .scrollIndicators(.hidden)
            .padding(.bottom, 12)
        }
        .frame(maxWidth: 560)
        .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: Radius.card))
        .background(Palette.base, in: RoundedRectangle(cornerRadius: Radius.card))
        .overlay(RoundedRectangle(cornerRadius: Radius.card).stroke(Palette.hairline, lineWidth: 1))
        .shadow(color: .black.opacity(0.3), radius: 18, y: 8)
        .padding(.horizontal, isCompact ? 12 : 28)
        .padding(.bottom, isCompact ? 10 : 22)
        .animation(.smooth(duration: 0.15), value: count)
        .sheet(isPresented: $creating, onDismiss: {
            if let id = newGroupId { apply(id) }
            newGroupId = nil
        }) {
            GroupPickerSheet(groupId: $newGroupId, groups: store.document.groups)
        }
        .background { numberKeys }
    }

    /// Con la Mac, 1–9 manda lo elegido al grupo de ese número sin tocar el
    /// ratón.
    @ViewBuilder
    private var numberKeys: some View {
        #if os(macOS)
        ForEach(Array(store.document.groups.prefix(9).enumerated()), id: \.element.id) { i, g in
            Button("") { apply(g.id) }
                .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")), modifiers: [])
                .opacity(0)
        }
        #endif
    }

    private func chip(name: String, color: String, number: Int?,
                      action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Circle().fill(Color.tint(color)).frame(width: 7, height: 7)
                Text(name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                #if os(macOS)
                if let number {
                    Text("\(number)")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundStyle(Palette.textFaint)
                }
                #endif
            }
            .padding(.horizontal, 11)
            .frame(height: 30)
            .background(Capsule().fill(Color.tint(color).opacity(0.13)))
            .overlay(Capsule().stroke(Color.tint(color).opacity(0.3), lineWidth: 1))
            .contentShape(Capsule())
        }
        .buttonStyle(.pressable)
    }

    private func apply(_ groupId: String?) {
        guard selection.isActive else { return }
        SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.3)) {
            store.setGroup(groupId, for: selection.ids)
            selection.clear()
        }
    }
}

/// Lo que el menú contextual de una tarea suma: elegirla, y mandarla a un
/// grupo. Si la tarea es parte de lo elegido, el grupo se aplica a todas.
struct SelectionMenuItems: View {
    let taskId: String

    @Environment(TaskStore.self) private var store
    @Environment(\.taskSelection) private var selection

    var body: some View {
        let targets = selection.contains(taskId) ? selection.ids : [taskId]
        if !selection.contains(taskId) {
            Button("Seleccionar") {
                withAnimation(.smooth(duration: 0.2)) { selection.toggle(taskId) }
            }
        }
        Menu(targets.count > 1 ? "Mover \(targets.count) al grupo" : "Grupo") {
            ForEach(store.document.groups) { g in
                Button(g.name) { apply(g.id, to: targets) }
            }
            Divider()
            Button("Sin grupo") { apply(nil, to: targets) }
        }
    }

    private func apply(_ groupId: String?, to ids: Set<String>) {
        SoundEffects.shared.play(.pop, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.3)) {
            store.setGroup(groupId, for: ids)
            if ids.count > 1 { selection.clear() }
        }
    }
}
