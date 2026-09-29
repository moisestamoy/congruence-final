import SwiftUI

@main
struct CongruenceApp: App {
    @State private var store: HabitStore
    @State private var finances: FinanceStore
    @State private var tasks: TaskStore
    @State private var auth: AuthService
    @State private var sync: SyncService

    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue
    @AppStorage("section") private var sectionRaw = AppSection.habits.rawValue
    @Environment(\.scenePhase) private var scenePhase

    init() {
        let store = HabitStore()
        let finances = FinanceStore()
        let tasks = TaskStore()
        let auth = AuthService()
        _store = State(initialValue: store)
        _finances = State(initialValue: finances)
        _tasks = State(initialValue: tasks)
        _auth = State(initialValue: auth)
        _sync = State(initialValue: SyncService(habits: store, finances: finances, tasks: tasks, auth: auth))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(finances)
                .environment(tasks)
                .environment(auth)
                .environment(sync)
                .preferredColorScheme(Appearance(rawValue: appearanceRaw)?.colorScheme)
                .background(AppBackground())
                .task {
                    #if os(macOS)
                    // ⌘⇧Espacio desde cualquier app: una línea al diario de hoy.
                    QuickCapture.shared.install(store: tasks, finances: finances)
                    #endif
                    await sync.refresh()
                }
                // Igual que la web al volver a la pestaña: al volver a la app, baja.
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await sync.refresh() } }
                }
        }
        .commands {
            // ⌘1 a ⌘4: cambiar de sección sin buscar la barra con el ratón.
            CommandMenu("Ir a") {
                ForEach(Array(AppSection.allCases.enumerated()), id: \.element) { i, section in
                    Button(section.label) {
                        withAnimation(.spring(response: 0.4, dampingFraction: 0.82)) {
                            sectionRaw = section.rawValue
                        }
                    }
                    .keyboardShortcut(KeyEquivalent(Character("\(i + 1)")), modifiers: .command)
                }
            }
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 820)
        .windowResizability(.contentMinSize)
        #endif

        #if os(macOS)
        // En la barra de menú: el porcentaje del día a la vista, y la app viva
        // aunque cierres la ventana, que es lo que mantiene el atajo de captura.
        MenuBarExtra {
            MenuBarContent().environment(store).environment(finances)
        } label: {
            MenuBarLabel().environment(store)
        }
        #endif
    }
}
