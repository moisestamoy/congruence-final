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
struct MenuBarContent: View {
    @Environment(HabitStore.self) private var habits
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled

    private var today: Int { habits.congruence(on: HabitDay.key(HabitDay.current())) }

    var body: some View {
        Text(today < 0 ? "Hoy: en pausa" : "Hoy: \(today)% de congruencia")

        Divider()

        Button("Capturar un pensamiento") { QuickCapture.shared.toggle() }
            .keyboardShortcut(" ", modifiers: [.command, .shift])

        Button("Abrir Congruence") { Self.openMainWindow() }

        Divider()

        Toggle("Abrir al iniciar sesión", isOn: $launchAtLogin)
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

        Divider()

        Button("Salir de Congruence") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }

    static func openMainWindow() {
        NSApp.activate(ignoringOtherApps: true)
        // La ventana principal es la única que no es un panel.
        if let ventana = NSApp.windows.first(where: { !($0 is NSPanel) && $0.canBecomeMain }) {
            ventana.makeKeyAndOrderFront(nil)
        }
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
