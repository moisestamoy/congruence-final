import SwiftUI
#if os(macOS)
import AppKit

/// El fondo translúcido de la ventana. Es un `NSVisualEffectView` en modo
/// `.behindWindow`: el sistema desenfoca lo que hay detrás de la ventana —el
/// escritorio, otras ventanas— y lo pinta acá. No es una imagen ni una
/// opacidad nuestra; es el mismo material que usan Finder o Notas.
struct WindowMaterial: NSViewRepresentable {
    var material: NSVisualEffectView.Material = .underWindowBackground

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = .behindWindow
        // Sin esto el material se apaga al perder el foco y la app parece
        // desactivada aunque estés escribiendo en ella.
        view.state = .active
        return view
    }

    func updateNSView(_ view: NSVisualEffectView, context: Context) {
        view.material = material
    }
}

/// Le saca el fondo opaco a la ventana. Sin esto macOS pinta su propio fondo
/// detrás del material y no queda nada que dejar pasar.
private struct TransparentWindow: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            guard let window = view.window else { return }
            window.isOpaque = false
            window.backgroundColor = .clear
        }
        return view
    }

    func updateNSView(_ view: NSView, context: Context) {}
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

    var body: some View {
        #if os(macOS)
        ZStack {
            WindowMaterial()
            Palette.base.opacity(scheme == .dark ? 0.58 : 0.72)
            TransparentWindow().frame(width: 0, height: 0)
        }
        .ignoresSafeArea()
        #else
        Palette.base.ignoresSafeArea()
        #endif
    }
}
