import SwiftUI

@main
struct CongruenceApp: App {
    @State private var store: HabitStore
    @State private var auth: AuthService
    @State private var sync: SyncService

    @Environment(\.scenePhase) private var scenePhase

    init() {
        let store = HabitStore()
        let auth = AuthService()
        _store = State(initialValue: store)
        _auth = State(initialValue: auth)
        _sync = State(initialValue: SyncService(store: store, auth: auth))
    }

    var body: some Scene {
        WindowGroup {
            TodayView()
                .environment(store)
                .environment(auth)
                .environment(sync)
                .preferredColorScheme(.dark)
                .background(Palette.base)
                .task { await sync.refresh() }
                // Igual que la web al volver a la pestaña: al volver a la app, baja.
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await sync.refresh() } }
                }
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 820)
        .windowResizability(.contentMinSize)
        #endif
    }
}
