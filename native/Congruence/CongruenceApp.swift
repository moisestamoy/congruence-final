import SwiftUI

@main
struct CongruenceApp: App {
    @State private var store = HabitStore()
    @State private var identity = IdentityStore()

    var body: some Scene {
        WindowGroup {
            TodayView()
                .environment(store)
                .environment(identity)
                .preferredColorScheme(.dark)
                .background(Palette.base)
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 820)
        .windowResizability(.contentMinSize)
        #endif
    }
}
