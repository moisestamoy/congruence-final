import SwiftUI

@main
struct CongruenceApp: App {
    @State private var store = HabitStore()

    var body: some Scene {
        WindowGroup {
            TodayView()
                .environment(store)
                .preferredColorScheme(.dark)
                .background(Palette.base)
        }
        #if os(macOS)
        .defaultSize(width: 1080, height: 720)
        .windowResizability(.contentMinSize)
        #endif
    }
}
