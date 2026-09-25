import SwiftUI

/// Arco de progreso que arranca arriba y gira en sentido horario.
private struct RingArc: Shape {
    var radius: CGFloat
    var progress: Double

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard radius > 0, progress > 0 else { return path }
        path.addArc(
            center: CGPoint(x: rect.midX, y: rect.midY),
            radius: radius,
            startAngle: .degrees(-90),
            endAngle: .degrees(-90 + 360 * min(progress, 1)),
            clockwise: false
        )
        return path
    }
}

/// Circunferencia completa, usada como riel de fondo.
private struct RingTrack: Shape {
    var radius: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        guard radius > 0 else { return path }
        path.addEllipse(in: CGRect(
            x: rect.midX - radius,
            y: rect.midY - radius,
            width: radius * 2,
            height: radius * 2
        ))
        return path
    }
}

/// Los tres anillos concéntricos. Es el concepto de la app, no un adorno:
/// mismas proporciones y opacidades que la versión web.
struct CongruenceRing: View {
    let percentage: Int
    var size: CGFloat = 160
    var level: Int = 1
    /// Sube cuando el día se completa: los anillos se encienden de adentro
    /// hacia afuera y sale una onda, como una piedra en el agua.
    var celebrate: Int = 0

    @State private var lit: [Bool] = [false, false, false]

    private struct Wave {
        var scale: CGFloat = 0.6
        var opacity: Double = 0
    }

    /// Siempre se dibuja a este tamaño y después se escala. Los radios y los
    /// grosores de trazo no son animables por su cuenta, así que si cambiara
    /// `size` directamente el anillo saltaría al cambiar de vista en vez de
    /// crecer. Escalar una figura vectorial además no pierde nitidez.
    private static let nominal: CGFloat = 400

    private static let baseRadius = nominal * 0.4
    private static let step = nominal * 0.09
    private static let stroke = nominal * 0.058

    private var colors: LevelColors { LevelColors.forLevel(level) }

    /// Un día entero en pausa (-1) no llena nada: no es 0%, es "no aplica".
    private var progress: Double {
        percentage <= 0 ? 0 : Double(percentage) / 100
    }

    private var ringSpecs: [(radius: CGFloat, opacity: Double)] {
        [
            (Self.baseRadius, level == 1 ? 0.2 : 0.3),
            (Self.baseRadius - Self.step, level == 1 ? 0.5 : 0.6),
            (Self.baseRadius - Self.step * 2, 1.0)
        ]
    }

    var body: some View {
        ZStack {
            // Resplandor ambiental detrás del anillo — crece con el nivel.
            Circle()
                .fill(Palette.nightGlow(colors.primary, level >= 3 ? 0.18 : 0.08))
                .frame(width: Self.nominal * (level >= 3 ? 1.0 : 0.55),
                       height: Self.nominal * (level >= 3 ? 1.0 : 0.55))
                .blur(radius: Self.nominal * (level >= 3 ? 0.25 : 0.14))

            ForEach(Array(ringSpecs.enumerated()), id: \.offset) { i, spec in
                if spec.radius > 0 {
                    // El índice 2 es el de adentro: se enciende primero.
                    let encendido = lit[2 - i]
                    ZStack {
                        RingTrack(radius: spec.radius)
                            .stroke(colors.track, lineWidth: Self.stroke)

                        RingArc(radius: spec.radius, progress: progress)
                            .stroke(
                                colors.primary.opacity(encendido ? 1 : spec.opacity),
                                style: StrokeStyle(lineWidth: Self.stroke, lineCap: .round)
                            )
                            .shadow(color: colors.glow, radius: colors.glowRadius)
                            .shadow(color: encendido ? colors.primary.opacity(0.8) : .clear,
                                    radius: encendido ? 26 : 0)
                            // De adentro hacia afuera, con un rebote corto:
                            // el anillo interior llega primero.
                            .animation(.spring(response: 0.7, dampingFraction: 0.68)
                                .delay(Double(2 - i) * 0.07), value: progress)
                    }
                }
            }

            // La onda del día completo: invisible hasta que el último anillo
            // se enciende, y entonces se abre y se apaga.
            Circle()
                .stroke(colors.primary, lineWidth: Self.stroke * 0.35)
                .frame(width: Self.baseRadius * 2, height: Self.baseRadius * 2)
                .keyframeAnimator(initialValue: Wave(), trigger: celebrate) { vista, w in
                    vista.scaleEffect(w.scale).opacity(w.opacity)
                } keyframes: { _ in
                    KeyframeTrack(\.scale) {
                        LinearKeyframe(0.6, duration: 0.55)
                        CubicKeyframe(1.45, duration: 1.3)
                    }
                    KeyframeTrack(\.opacity) {
                        LinearKeyframe(0, duration: 0.5)
                        LinearKeyframe(0.6, duration: 0.05)
                        CubicKeyframe(0, duration: 1.3)
                    }
                }
                .allowsHitTesting(false)
        }
        .frame(width: Self.nominal, height: Self.nominal)
        .scaleEffect(size / Self.nominal)
        .frame(width: size, height: size)
        .onChange(of: celebrate) { _, _ in celebrateDay() }
    }

    private func celebrateDay() {
        for i in 0..<3 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15 + Double(i) * 0.16) {
                withAnimation(.easeOut(duration: 0.3)) { lit[i] = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.55) {
                    withAnimation(.easeIn(duration: 0.6)) { lit[i] = false }
                }
            }
        }
    }
}

/// El anillo con su lectura debajo — el bloque que define la pantalla de hoy.
struct CongruenceDial: View {
    let percentage: Int
    let level: Int
    var size: CGFloat = 260
    var phrase: String?
    var celebrate: Int = 0

    private var isPaused: Bool { percentage == -1 }
    private var colors: LevelColors { LevelColors.forLevel(level) }

    /// El porcentaje tiene tamaño propio, no atado al anillo. Así no pega un
    /// salto de tipografía cada vez que el anillo cambia de tamaño — y es lo
    /// mismo que hace la web.
    private var percentSize: CGFloat { min(88, size * 0.2) }

    var body: some View {
        VStack(spacing: 0) {
            CongruenceRing(percentage: percentage, size: size, level: level, celebrate: celebrate)
                // Un día en pausa se duerme despacio, no se apaga de golpe.
                .opacity(isPaused ? 0.35 : 1)
                .saturation(isPaused ? 0.2 : 1)
                .animation(.easeInOut(duration: 1.2), value: isPaused)

            VStack(spacing: 8) {
                Text(isPaused ? "—" : "\(max(percentage, 0))%")
                    .font(.system(size: percentSize, weight: .bold))
                    .monospacedDigit()
                    .contentTransition(.numericText())
                    .animation(.smooth(duration: 0.5), value: percentage)
                    .foregroundStyle(isPaused ? Palette.textMuted : colors.primary)
                    .shadow(color: Palette.nightGlow(colors.primary, 0.35), radius: 18)

                Text(isPaused ? "En pausa" : "Estabilidad")
                    .microLabelStyle(isPaused ? Palette.textFaint : colors.primary, size: 11)
            }
            .padding(.top, 28)

            if let phrase {
                Text("“\(phrase)”")
                    .font(.system(size: 13, weight: .light, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                    .frame(maxWidth: 420)
                    // En angosto la frase va en dos líneas, no cortada.
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 36)
            }
        }
    }
}
