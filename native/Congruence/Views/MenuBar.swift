#if os(macOS)
import AppKit
import ServiceManagement
import SwiftUI

/// Congruence en la barra de menú.
///
/// Dos razones. La primera es práctica: la captura con ⌘⇧Espacio vive
/// mientras la app vive, y con esto la app sigue viva aunque cierres la
/// ventana. La segunda es la idea de la app: el porcentaje del día a la vista
/// todo el rato, como un espejo pequeño en una esquina, sin tener que ir a
/// buscarlo.
///
/// Es un panel y no un menú: un menú de macOS no puede tener listas ni campos
/// de escribir, y desde acá se ven y se añaden tareas y notas sin abrir la
/// ventana grande.
struct MenuBarContent: View {
    enum Tab: String, CaseIterable {
        case tareas, notas
        var label: String { self == .tareas ? "Tareas" : "Notas" }
    }

    @Environment(HabitStore.self) private var habits
    @Environment(FinanceStore.self) private var finances
    @Environment(TaskStore.self) private var tasks
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @AppStorage("menuBarTab") private var tabRaw = Tab.tareas.rawValue

    private var tab: Tab { Tab(rawValue: tabRaw) ?? .tareas }
    private var today: Int { habits.congruence(on: HabitDay.key(HabitDay.current())) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            Divider().overlay(Palette.hairlineFaint)
            tabs
            Group {
                switch tab {
                case .tareas: MenuBarTasks()
                case .notas:  MenuBarNotes()
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 12)
            Divider().overlay(Palette.hairlineFaint)
            footer
        }
        .frame(width: 360)
        .background(Palette.base)
    }

    private var header: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(today < 0 ? "En pausa" : "\(today)%")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .foregroundStyle(Palette.text)
                .monospacedDigit()
            Text("congruencia hoy")
                .font(.system(size: 11))
                .foregroundStyle(Palette.textMuted)
            Spacer()
            if let a = FinanceEngine.allowance(doc: finances.document) {
                Text(a.today < 0
                     ? "Te pasaste \(Money.format(-a.today, doc: finances.document))"
                     : "Puedes gastar \(Money.format(a.today, doc: finances.document))")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(a.today < 0 ? Palette.negative : Palette.positive)
            }
        }
        .padding(.horizontal, 14)
        .padding(.top, 14)
        .padding(.bottom, 12)
    }

    private var tabs: some View {
        HStack(spacing: 18) {
            ForEach(Tab.allCases, id: \.self) { t in
                Button { withAnimation(.smooth(duration: 0.18)) { tabRaw = t.rawValue } } label: {
                    VStack(spacing: 5) {
                        Text(t.label)
                            .font(.system(size: 10, weight: .bold))
                            .tracking(1.4)
                            .textCase(.uppercase)
                            .foregroundStyle(tab == t ? Palette.text : Palette.textFaint)
                        Rectangle()
                            .fill(tab == t ? Palette.text.opacity(0.4) : .clear)
                            .frame(height: 1)
                    }
                    .fixedSize()
                    .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
            }
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.top, 10)
        .padding(.bottom, 10)
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: 0) {
            footerButton("Capturar un pensamiento", shortcut: "⇧⌘Espacio") {
                QuickCapture.shared.toggle()
            }
            footerButton("Abrir Congruence", shortcut: nil) { Self.openMainWindow() }
            Toggle(isOn: $launchAtLogin) {
                Text("Abrir al iniciar sesión")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.textMuted)
            }
            .toggleStyle(.switch)
            .controlSize(.mini)
            .padding(.horizontal, 14)
            .frame(height: 28)
            .onChange(of: launchAtLogin) { _, activar in
                do {
                    if activar {
                        try SMAppService.mainApp.register()
                    } else {
                        try SMAppService.mainApp.unregister()
                    }
                } catch {
                    // Si macOS no lo permite, el interruptor vuelve a como
                    // estaba de verdad en vez de mentir.
                    launchAtLogin = SMAppService.mainApp.status == .enabled
                }
            }
            footerButton("Salir de Congruence", shortcut: "⌘Q") { NSApp.terminate(nil) }
                .keyboardShortcut("q")
        }
        .padding(.vertical, 6)
    }

    private func footerButton(_ title: String, shortcut: String?,
                              action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Text(title).font(.system(size: 12)).foregroundStyle(Palette.text)
                Spacer()
                if let shortcut {
                    Text(shortcut).font(.system(size: 11)).foregroundStyle(Palette.textFaint)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 28)
            .contentShape(Rectangle())
        }
        .buttonStyle(MenuRowStyle())
    }

    static func openMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        // La ventana principal es la única que no es un panel.
        if let ventana = NSApp.windows.first(where: { !($0 is NSPanel) && $0.canBecomeMain }) {
            ventana.makeKeyAndOrderFront(nil)
        }
    }
}

/// Una fila del panel que se ilumina al pasar el ratón, como en un menú.
private struct MenuRowStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        MenuRow(configuration: configuration)
    }

    private struct MenuRow: View {
        let configuration: ButtonStyleConfiguration
        @State private var hovering = false

        var body: some View {
            configuration.label
                .background(hovering || configuration.isPressed ? Palette.fill(0.07) : .clear,
                            in: RoundedRectangle(cornerRadius: Radius.inner))
                .padding(.horizontal, 6)
                .onHover { hovering = $0 }
        }
    }
}

// MARK: - Tareas

/// Lo pendiente, partido por tipo como en la app, y el mismo campo de
/// escribir: pregunta tipo y grupo, entiende "#grupo".
private struct MenuBarTasks: View {
    @Environment(TaskStore.self) private var store
    @State private var composing: TaskColumn?

    var body: some View {
        let secciones = TaskStore.byTier(store.pending())
        VStack(alignment: .leading, spacing: 10) {
            if composing != nil {
                TaskComposer(column: .pending, composing: $composing, compact: true)
            } else {
                Button { withAnimation(.smooth(duration: 0.18)) { composing = .pending } } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "plus").font(.system(size: 10, weight: .bold))
                        Text("Nueva tarea").font(.system(size: 12, weight: .semibold))
                        Spacer()
                    }
                    .foregroundStyle(Palette.accent)
                    .padding(.horizontal, 11)
                    .frame(height: 34)
                    .background(RoundedRectangle(cornerRadius: Radius.row).fill(Palette.fill(0.05)))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
                .keyboardShortcut("n", modifiers: .command)
            }

            if secciones.isEmpty {
                Text("Nada pendiente. Disfrútalo.")
                    .font(.system(size: 13, weight: .light, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(secciones, id: \.tier) { entry in
                            VStack(alignment: .leading, spacing: 2) {
                                TierHeader(tier: entry.tier, count: entry.tasks.count)
                                    .padding(.bottom, 2)
                                ForEach(entry.tasks) { task in
                                    MenuBarTaskRow(task: task)
                                }
                            }
                        }
                    }
                }
                .frame(maxHeight: 320)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct MenuBarTaskRow: View {
    let task: TodoTask

    @Environment(TaskStore.self) private var store
    @State private var done = false

    var body: some View {
        HStack(spacing: 9) {
            Button(action: complete) {
                ZStack {
                    Circle()
                        .stroke(done ? tint : Palette.hairline, lineWidth: 1.5)
                    Circle().fill(tint).scaleEffect(done ? 1 : 0.01).opacity(done ? 1 : 0)
                    Image(systemName: "checkmark")
                        .font(.system(size: 7, weight: .black))
                        .foregroundStyle(Palette.onAccent)
                        .opacity(done ? 1 : 0)
                }
                .frame(width: 15, height: 15)
                .contentShape(Rectangle())
            }
            .buttonStyle(.pressable)
            .help("Completar")

            Text(task.text)
                .font(.system(size: 12))
                .foregroundStyle(done ? Palette.textFaint : Palette.text)
                .strikethrough(done, color: Palette.textFaint)
                .lineLimit(2)

            Spacer(minLength: 6)

            if task.tier == nil {
                QuickTierButtons(taskId: task.id)
                    .scaleEffect(0.85, anchor: .trailing)
            } else if let g = store.group(task.groupId) {
                GroupTag(group: g)
            }
        }
        .padding(.vertical, 5)
        .contentShape(Rectangle())
    }

    private var tint: Color { task.tier.map { Color.tint($0.hex) } ?? Palette.accent }

    /// Primero se llena el círculo, después la fila se va: igual que en la app.
    private func complete() {
        guard !done else { return }
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) { done = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.smooth(duration: 0.3)) { store.toggleTask(task.id) }
        }
    }
}

// MARK: - Notas

/// Las notas de hoy y un campo para escribir otra. Sólo palabras: ni tareas
/// ni dinero acá, igual que en el Diario.
private struct MenuBarNotes: View {
    @Environment(TaskStore.self) private var store
    @State private var draft = ""
    @FocusState private var writing: Bool

    var body: some View {
        let notas = store.notes(on: HabitDay.current())
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .trailing, spacing: 6) {
                TextField("", text: $draft, prompt: Text("Escribe una nota y pulsa Enter"),
                          axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1...6)
                    .focused($writing)
                    .onSubmit(save)
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: Radius.row).fill(Palette.fill(0.06)))
                    .overlay(RoundedRectangle(cornerRadius: Radius.row)
                        .stroke(writing ? Palette.accent.opacity(0.4) : Palette.hairlineFaint,
                                lineWidth: 1))
                if writing {
                    Text("⌥Enter para otra línea")
                        .font(.system(size: 9))
                        .foregroundStyle(Palette.textFaint)
                }
            }

            if notas.isEmpty {
                Text("Hoy todavía no escribiste nada.")
                    .font(.system(size: 13, weight: .light, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(notas) { nota in
                            VStack(alignment: .leading, spacing: 3) {
                                HStack {
                                    Text(nota.title.isEmpty ? "Sin título" : nota.title)
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundStyle(Palette.text)
                                        .lineLimit(1)
                                    Spacer()
                                    Text(DateFormatter.es("HH:mm").string(from: nota.date))
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundStyle(Palette.textFaint)
                                }
                                if nota.content != nota.title && !nota.content.isEmpty {
                                    Text(nota.content)
                                        .font(.system(size: 11))
                                        .foregroundStyle(Palette.textMuted)
                                        .lineLimit(3)
                                }
                            }
                            .padding(10)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RoundedRectangle(cornerRadius: Radius.inner)
                                .fill(Palette.fill(0.035)))
                        }
                    }
                }
                .frame(maxHeight: 300)
                .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func save() {
        let texto = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !texto.isEmpty else { return }
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.25)) {
            store.addNote(title: QuickCapture.title(from: texto), content: texto)
        }
        draft = ""
        writing = true
    }
}

/// Lo que se ve en la barra: el anillo y el porcentaje del día.
struct MenuBarLabel: View {
    @Environment(HabitStore.self) private var habits

    private var today: Int { habits.congruence(on: HabitDay.key(HabitDay.current())) }

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "circle.circle")
            Text(today < 0 ? "—" : "\(today)%")
                .monospacedDigit()
        }
    }
}
#endif
