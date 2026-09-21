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
    var strokeWidth: CGFloat = 10
    var level: Int = 1

    private var baseRadius: CGFloat { size * 0.4 }
    private var step: CGFloat { size * 0.09 }
    private var colors: LevelColors { LevelColors.forLevel(level) }

    /// Un día entero en pausa (-1) no llena nada: no es 0%, es "no aplica".
    private var progress: Double {
        percentage <= 0 ? 0 : Double(percentage) / 100
    }

    private var ringSpecs: [(radius: CGFloat, opacity: Double)] {
        [
            (baseRadius, level == 1 ? 0.2 : 0.3),
            (baseRadius - step, level == 1 ? 0.5 : 0.6),
            (baseRadius - step * 2, 1.0)
        ]
    }

    var body: some View {
        ZStack {
            ForEach(Array(ringSpecs.enumerated()), id: \.offset) { _, spec in
                if spec.radius > 0 {
                    ZStack {
                        RingTrack(radius: spec.radius)
                            .stroke(Color.white.opacity(0.05), lineWidth: strokeWidth)

                        RingArc(radius: spec.radius, progress: progress)
                            .stroke(
                                colors.primary.opacity(spec.opacity),
                                style: StrokeStyle(lineWidth: strokeWidth, lineCap: .round)
                            )
                            .shadow(color: colors.glow, radius: colors.glowRadius)
                    }
                }
            }
        }
        .frame(width: size, height: size)
        .animation(.easeOut(duration: 0.6), value: progress)
    }
}

/// El anillo con su lectura debajo — el bloque que define la pantalla de hoy.
struct CongruenceDial: View {
    let percentage: Int
    let level: Int
    var size: CGFloat = 260
    var phrase: String?

    private var isPaused: Bool { percentage == -1 }
    private var colors: LevelColors { LevelColors.forLevel(level) }

    var body: some View {
        VStack(spacing: 0) {
            CongruenceRing(
                percentage: percentage,
                size: size,
                strokeWidth: max(10, size * 0.058),
                level: level
            )

            VStack(spacing: 6) {
                Text(isPaused ? "—" : "\(max(percentage, 0))%")
                    .font(.system(size: size * 0.22, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(isPaused ? Palette.textMuted : colors.primary)

                Text(isPaused ? "En pausa" : "Estabilidad")
                    .microLabelStyle(Palette.textFaint, size: 10)
            }
            .padding(.top, size * 0.12)

            if let phrase {
                Text(phrase)
                    .font(.system(size: 12, weight: .light, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .frame(maxWidth: size * 1.15)
                    .padding(.top, size * 0.11)
            }
        }
    }
}
