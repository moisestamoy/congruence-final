import SwiftUI
#if os(macOS)
import AppKit

/// El fondo translúcido de la ventana. Es un `NSVisualEffectView` en modo
/// `.behindWindow`: el sistema desenfoca lo que hay detrás de la ventana —el
/// escritorio, otras ventanas— y lo pinta acá. No es una imagen ni una
/// opacidad nuestra; es el mismo material que usan Finder o Notas.
struct WindowMaterial: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .sidebar
    /// La apariencia con la que se dibuja el material. Hay que fijarla a mano:
    /// `NSVisualEffectView` hereda la de la ventana, no la de SwiftUI, así que
    /// si eliges modo oscuro con el sistema en claro el fondo sale claro
    /// detrás de una interfaz oscura.
    var dark: Bool = false

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.blendingMode = .behindWindow
        // Sin esto el material se apaga al perder el foco y la app parece
        // desactivada aunque estés escribiendo en ella.
        view.state = .active
        apply(to: view)
        return view
    }

    func updateNSView(_ view: NSVisualEffectView, context: Context) {
        apply(to: view)
    }

    private func apply(to view: NSVisualEffectView) {
        view.material = material
        view.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    }
}

/// Le saca el fondo opaco a la ventana. Sin esto macOS pinta su propio fondo
/// detrás del material y no queda nada que dejar pasar.
///
/// El trabajo va en `viewDidMoveToWindow` y no en `makeNSView`: cuando SwiftUI
/// crea la vista todavía no está en ninguna ventana, así que ahí `window` es
/// `nil` y el ajuste se pierde sin avisar.
private struct TransparentWindow: NSViewRepresentable {
    final class Host: NSView {
        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            apply()
        }

        func apply() {
            guard let window else { return }
            window.isOpaque = false
            window.backgroundColor = .clear
            // SwiftUI vuelve a pintar el fondo de la ventana en algunos
            // cambios de tamaño y de apariencia, así que se reafirma.
            window.titlebarAppearsTransparent = true
        }
    }

    func makeNSView(context: Context) -> Host { Host() }

    func updateNSView(_ view: Host, context: Context) {
        DispatchQueue.main.async { view.apply() }
    }
}

#endif

/// El fondo de la app: el material del sistema y, encima, un velo del color
/// base.
///
/// El velo es lo que mantiene la identidad de Congruence. Sin él la app toma
/// el color del fondo de escritorio de cada uno y deja de ser esta app; con
/// él se ve el escritorio detrás, pero teñido y en su sitio. En claro pide
/// más velo: un fondo brillante atravesando la ventana se come el texto.
struct AppBackground: View {
    @Environment(\.colorScheme) private var scheme
    @AppStorage("translucency") private var levelRaw = Translucency.medium.rawValue

    private var level: Translucency { Translucency(rawValue: levelRaw) ?? .medium }

    var body: some View {
        #if os(macOS)
        ZStack {
            WindowMaterial(material: level.material, dark: scheme == .dark)
            Palette.base.opacity(level.veil(dark: scheme == .dark))

            // Arriba va un velo extra que se desvanece. Es la banda donde
            // cada pantalla pone su título, y es justo donde una mancha del
            // fondo hace más daño.
            if level != .solid {
                LinearGradient(
                    colors: [Palette.base.opacity(scheme == .dark ? 0.5 : 0.55), .clear],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 280)
                .frame(maxHeight: .infinity, alignment: .top)
            }
            TransparentWindow().frame(width: 0, height: 0)
        }
        .ignoresSafeArea()
        #else
        Palette.base.ignoresSafeArea()
        #endif
    }
}
