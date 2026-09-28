import SwiftUI

/// Las piezas de movimiento que comparte toda la app.
///
/// La regla: se mueve lo que ya está, para decir algo que ya pasó — que
/// terminaste, que cambió, que llegó. Nada se mueve para adornar.

// MARK: - Aparición en cascada

/// Las filas y tarjetas entran una tras otra, con unos milisegundos entre
/// cada una, como cartas que se reparten. Sólo la primera vez que aparecen.
private struct StaggeredAppear: ViewModifier {
    let index: Int
    @State private var shown = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown || reduceMotion ? 0 : 8)
            .onAppear {
                guard !shown else { return }
                if reduceMotion { shown = true; return }
                // Más allá de la duodécima no se nota el orden, sólo la espera.
                let delay = Double(min(index, 12)) * 0.035
                withAnimation(.smooth(duration: 0.4).delay(delay)) { shown = true }
            }
    }
}

extension View {
    func staggeredAppear(_ index: Int) -> some View {
        modifier(StaggeredAppear(index: index))
    }
}

// MARK: - Tachado que corre

/// Un tachado que se dibuja de izquierda a derecha, como una línea hecha a
/// mano, en vez de aparecer de golpe.
private struct AnimatedStrike: ViewModifier {
    let active: Bool
    let color: Color
    var delay: Double = 0

    func body(content: Content) -> some View {
        content.overlay(alignment: .leading) {
            GeometryReader { g in
                Rectangle()
                    .fill(color)
                    .frame(width: active ? g.size.width : 0, height: 1)
                    .frame(maxHeight: .infinity, alignment: .center)
                    .animation(.easeOut(duration: 0.35).delay(active ? delay : 0), value: active)
            }
            .allowsHitTesting(false)
        }
    }
}

extension View {
    func animatedStrike(_ active: Bool, color: Color, delay: Double = 0) -> some View {
        modifier(AnimatedStrike(active: active, color: color, delay: delay))
    }
}

// MARK: - Check que se dibuja

/// Una marca de verificación que se traza, para animarla con `trim`.
struct CheckmarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX + rect.width * 0.22, y: rect.midY + rect.height * 0.02))
        p.addLine(to: CGPoint(x: rect.minX + rect.width * 0.43, y: rect.maxY - rect.height * 0.25))
        p.addLine(to: CGPoint(x: rect.maxX - rect.width * 0.2, y: rect.minY + rect.height * 0.28))
        return p
    }
}

/// Un círculo con check que se dibuja al marcarse.
struct DrawnCheck: View {
    let checked: Bool
    var size: CGFloat = 15
    var tint: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(checked ? tint : Palette.textFaint, lineWidth: 1.3)
            Circle()
                .fill(tint)
                .scaleEffect(checked ? 1 : 0.001)
            CheckmarkShape()
                .trim(from: 0, to: checked ? 1 : 0)
                .stroke(Palette.onAccent, style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))
                .padding(size * 0.12)
        }
        .frame(width: size, height: size)
        .animation(.spring(response: 0.35, dampingFraction: 0.7), value: checked)
    }
}

// MARK: - Hoja de calendario

/// Girar una fecha como la hoja de un calendario de escritorio.
struct PageFlip: ViewModifier {
    let angle: Double

    func body(content: Content) -> some View {
        content
            .rotation3DEffect(.degrees(angle), axis: (x: 1, y: 0, z: 0),
                              anchor: .top, perspective: 0.6)
            .opacity(abs(angle) > 60 ? 0 : 1)
    }
}

extension AnyTransition {
    /// Hacia adelante la hoja nueva cae desde arriba; hacia atrás, vuelve.
    static func pageFlip(forward: Bool) -> AnyTransition {
        .asymmetric(
            insertion: .modifier(active: PageFlip(angle: forward ? -90 : 90),
                                 identity: PageFlip(angle: 0)),
            removal: .modifier(active: PageFlip(angle: forward ? 90 : -90),
                               identity: PageFlip(angle: 0))
        )
    }
}

// MARK: - Tinta

/// El texto se asienta letra a letra, de un leve desenfoque a nítido, como
/// tinta que se seca. Necesita macOS 15 / iOS 18; antes, aparece de una vez
/// con un fundido.
@available(macOS 15, iOS 18, *)
private struct InkRenderer: TextRenderer, Animatable {
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func draw(layout: Text.Layout, in ctx: inout GraphicsContext) {
        let letras = layout.flatMap { $0 }.flatMap { $0 }
        let total = Double(max(letras.count, 1))
        for (i, letra) in letras.enumerated() {
            let inicio = Double(i) / total * 0.75
            let t = min(max((progress - inicio) / 0.25, 0), 1)
            var c = ctx
            c.opacity = t
            if t < 1 { c.addFilter(.blur(radius: (1 - t) * 2.5)) }
            c.draw(letra)
        }
    }
}

private struct InkReveal: ViewModifier {
    let trigger: Int
    @State private var progress: Double = 1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        Group {
            if #available(macOS 15, iOS 18, *) {
                content.textRenderer(InkRenderer(progress: progress))
            } else {
                content.opacity(progress)
            }
        }
        .onChange(of: trigger) { _, _ in
            guard !reduceMotion else { return }
            progress = 0
            withAnimation(.easeOut(duration: 1.4)) { progress = 1 }
        }
    }
}

extension View {
    /// Cada vez que `trigger` cambia, el texto se vuelve a asentar.
    func inkReveal(trigger: Int) -> some View {
        modifier(InkReveal(trigger: trigger))
    }
}

// MARK: - Botones que responden

/// El estilo de botón de toda la app. Al pasar el puntero se ilumina un
/// poco; al pulsarlo se hunde, como algo físico. Sin fondo propio: cada
/// botón conserva su forma.
struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        PressableBody(configuration: configuration)
    }

    private struct PressableBody: View {
        let configuration: Configuration
        @State private var hovering = false
        @Environment(\.isEnabled) private var isEnabled
        @Environment(\.accessibilityReduceMotion) private var reduceMotion

        var body: some View {
            configuration.label
                .brightness(hovering && isEnabled ? 0.05 : 0)
                .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
                .opacity(configuration.isPressed && reduceMotion ? 0.7 : 1)
                .animation(.spring(response: 0.22, dampingFraction: 0.7), value: configuration.isPressed)
                .animation(.easeOut(duration: 0.15), value: hovering)
                .onHover { hovering = $0 }
        }
    }
}

extension ButtonStyle where Self == PressableButtonStyle {
    static var pressable: PressableButtonStyle { PressableButtonStyle() }
}

// MARK: - Resaltado al pasar

/// Para lo que se toca pero no es un botón (una fila de hábito, una
/// tarjeta que abre algo): un velo leve cuando el puntero está encima. Es
/// cómo se ve "esto responde" antes de hacer clic.
private struct HoverHighlight: ViewModifier {
    let cornerRadius: CGFloat
    @State private var hovering = false

    func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(Palette.fill(hovering ? 0.035 : 0))
                    .allowsHitTesting(false)
            )
            .animation(.easeOut(duration: 0.15), value: hovering)
            .onHover { hovering = $0 }
    }
}

extension View {
    func hoverHighlight(_ cornerRadius: CGFloat = Radius.row) -> some View {
        modifier(HoverHighlight(cornerRadius: cornerRadius))
    }
}

// MARK: - Movimiento reducido

/// Con "Reducir movimiento" activado en el sistema, toda animación de la
/// app pasa a ser un fundido corto: sin rebotes, sin desplazamientos, sin
/// demoras en cascada. Se aplica una vez, en la raíz.
private struct RespectReduceMotion: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content.transaction { t in
            guard reduceMotion, t.animation != nil else { return }
            t.animation = .easeInOut(duration: 0.15)
        }
    }
}

extension View {
    func respectingReduceMotion() -> some View {
        modifier(RespectReduceMotion())
    }
}
