import SwiftUI
#if os(macOS)
import AppKit
#endif

/// El marco de la app: la barra lateral y la sección elegida.
struct RootView: View {
    @AppStorage("section") private var sectionRaw = AppSection.habits.rawValue
    @State private var isLoggingIn = false
    @Environment(HabitStore.self) private var habits

    private var section: Binding<AppSection> {
        Binding(
            get: { AppSection(rawValue: sectionRaw) ?? .habits },
            set: { sectionRaw = $0.rawValue }
        )
    }

    var body: some View {
        GeometryReader { geo in
            let compact = isCompact(width: geo.size.width)
            Group {
                if compact {
                    // En el teléfono la navegación va abajo, bajo el pulgar.
                    content
                        .safeAreaInset(edge: .bottom, spacing: 0) {
                            PhoneTabBar(selection: section, onLogin: { isLoggingIn = true })
                        }
                } else {
                    HStack(spacing: 0) {
                        Sidebar(selection: section, onLogin: { isLoggingIn = true })
                        content
                    }
                }
            }
            .environment(\.isCompact, compact)
        }
        .background(alignment: .top) { dayGlow }
        .sheet(isPresented: $isLoggingIn) { LoginSheet() }
        #if DEBUG && os(macOS)
        .onAppear {
            if Compact.debugPhone { PhoneWindow.shrink() } else { PhoneWindow.restoreIfShrunk() }
        }
        #endif
    }

    private func isCompact(width: CGFloat) -> Bool {
        #if DEBUG
        if Compact.debugPhone { return true }
        #endif
        return width < Compact.threshold
    }

    private var content: some View {
        Group {
            switch section.wrappedValue {
            case .habits:   TodayView()
            case .finances: FinancesView()
            case .tasks:    TasksView()
            case .stats:    StatsView()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // La pantalla nueva entra desde el lado de la barra, que es de
        // donde la pediste; la anterior sólo se apaga.
        .id(section.wrappedValue)
        .transition(.asymmetric(
            insertion: .opacity.combined(with: .offset(x: -16)),
            removal: .opacity))
    }

    /// El color de tu día, muy tenue, arriba de todo. Gris al empezar, en el
    /// color de tu nivel cuando lo cierras. Se nota sin mirarlo.
    private var dayGlow: some View {
        let hoy = max(0, habits.congruence(on: HabitDay.key(HabitDay.current())))
        let color = LevelColors.forLevel(habits.level(for: habits.streak())).primary
        return Ellipse()
            .fill(RadialGradient(colors: [Palette.nightGlow(color, 0.16 * Double(hoy) / 100), .clear],
                                 center: .center, startRadius: 0, endRadius: 520))
            .frame(width: 1100, height: 420)
            .offset(y: -210)
            .blur(radius: 30)
            .allowsHitTesting(false)
            .animation(.easeInOut(duration: 2.5), value: hoy)
            .ignoresSafeArea()
    }
}

#if DEBUG && os(macOS)
/// Achica la ventana principal a un iPhone 16 (393 × 852), y al volver a
/// abrir sin el modo de prueba le devuelve el tamaño que tenía: macOS
/// recuerda el último tamaño y si no, la app quedaría angosta para siempre.
enum PhoneWindow {
    private static let savedKey = "debugPhone.previousFrame"

    private static var mainWindow: NSWindow? {
        NSApp.windows.first(where: { !($0 is NSPanel) && $0.canBecomeMain })
    }

    static func shrink() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            guard let ventana = mainWindow else { return }
            if UserDefaults.standard.string(forKey: savedKey) == nil {
                UserDefaults.standard.set(NSStringFromRect(ventana.frame), forKey: savedKey)
            }
            ventana.contentMinSize = NSSize(width: 320, height: 480)
            ventana.setContentSize(NSSize(width: 393, height: 852))
        }
    }

    static func restoreIfShrunk() {
        guard let guardado = UserDefaults.standard.string(forKey: savedKey) else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            mainWindow?.setFrame(NSRectFromString(guardado), display: true, animate: false)
            UserDefaults.standard.removeObject(forKey: savedKey)
        }
    }
}
#endif

/// Las secciones que todavía viven sólo en la web. Mejor decirlo que dejar un
/// botón que no hace nada.
struct NotBuiltYet: View {
    let section: AppSection

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: section.symbol)
                .font(.system(size: 22, weight: .light))
                .foregroundStyle(Palette.textFaint)
            Text(section.label)
                .font(.system(size: 15, weight: .bold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(Palette.textMuted)
            Text("Todavía no está en la app nativa.\nPor ahora vive en la versión web.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.textFaint)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
