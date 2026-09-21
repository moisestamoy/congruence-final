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
            // Resplandor ambiental detrás del anillo — crece con el nivel.
            Circle()
                .fill(colors.primary.opacity(level >= 3 ? 0.18 : 0.08))
                .frame(width: size * (level >= 3 ? 1.0 : 0.55),
                       height: size * (level >= 3 ? 1.0 : 0.55))
                .blur(radius: size * (level >= 3 ? 0.25 : 0.14))

            ForEach(Array(ringSpecs.enumerated()), id: \.offset) { _, spec in
                if spec.radius > 0 {
                    ZStack {
                        RingTrack(radius: spec.radius)
                            .stroke(Color.white.opacity(0.055), lineWidth: strokeWidth)

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

            VStack(spacing: 8) {
                Text(isPaused ? "—" : "\(max(percentage, 0))%")
                    .font(.system(size: size * 0.16, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(isPaused ? Palette.textMuted : colors.primary)
                    .shadow(color: colors.primary.opacity(0.35), radius: 18)

                Text(isPaused ? "En pausa" : "Estabilidad")
                    .microLabelStyle(isPaused ? Palette.textFaint : colors.primary, size: 11)
            }
            .padding(.top, size * 0.06)

            if let phrase {
                Text("“\(phrase)”")
                    .font(.system(size: 13, weight: .light, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .multilineTextAlignment(.center)
                    .lineSpacing(5)
                    .frame(maxWidth: min(size * 0.85, 420))
                    .padding(.top, size * 0.07)
            }
        }
    }
}
