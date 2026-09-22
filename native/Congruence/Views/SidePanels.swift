import SwiftUI

/// Encabezado de tarjeta: barrita de acento + etiqueta micro en mayúscula.
struct PanelHeader: View {
    let title: String
    var accent: Color = Palette.accent

    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 1)
                .fill(accent)
                .frame(width: 3, height: 11)
            Text(title)
                .microLabelStyle(Palette.textMuted, size: 9)
        }
    }
}

struct PanelCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardSurface(18)
    }
}

struct IdentityCard: View {
    let manifesto: IdentityManifesto

    var body: some View {
        PanelCard {
            VStack(alignment: .leading, spacing: 0) {
                PanelHeader(title: "Tu identidad")
                    .padding(.bottom, 22)

                if manifesto.isEmpty {
                    Text("Todavía no definiste quién estás siendo.")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Palette.textFaint)
                        .lineSpacing(4)
                } else {
                    Text("“\(manifesto.identityStatement)”")
                        .font(.system(size: 19, weight: .bold))
                        .foregroundStyle(Palette.text)
                        .lineSpacing(5)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if !manifesto.ninetyDayGoal.isEmpty {
                    HStack(alignment: .top, spacing: 6) {
                        Text("90 días:")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Palette.accent)
                        Text(manifesto.ninetyDayGoal)
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.textMuted)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.top, 16)
                }
            }
        }
    }
}

struct NinetyDayCard: View {
    let congruentDays: Int
    let weekDots: [Bool]

    private var progress: Double { Double(congruentDays) / 90 }

    var body: some View {
        PanelCard {
            VStack(alignment: .leading, spacing: 0) {
                PanelHeader(title: "Progreso 90 días")
                    .padding(.bottom, 18)

                HStack(alignment: .firstTextBaseline, spacing: 3) {
                    Text("\(congruentDays)")
                        .font(.system(size: 40, weight: .bold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                    Text("/90")
                        .font(.system(size: 15, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.textFaint)
                    Text("días")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint)
                        .padding(.leading, 4)
                }
                .padding(.bottom, 16)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Palette.fill(0.05))
                        Capsule()
                            .fill(Palette.accent)
                            .frame(width: max(0, geo.size.width * progress))
                    }
                }
                .frame(height: 3)
                .padding(.bottom, 14)

                HStack(spacing: 6) {
                    ForEach(Array(weekDots.enumerated()), id: \.offset) { _, done in
                        Capsule()
                            .fill(done ? Palette.accent : Palette.fill(0.06))
                            .frame(height: 3)
                    }
                }
                .padding(.bottom, 10)

                Text("Última semana")
                    .microLabelStyle(Palette.textFaint, size: 8)
            }
        }
    }
}

struct CoachCard: View {
    var onAnalyze: () -> Void = {}

    private let violet = FinPalette.recurring

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Image(systemName: "brain")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(violet)
                    .frame(width: 28, height: 28)
                    .background(violet.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 1) {
                    Text("Coach IA")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Palette.text)
                    Text("Análisis diario")
                        .microLabelStyle(Palette.textFaint, size: 8)
                }

                Spacer()

                Button(action: onAnalyze) {
                    HStack(spacing: 5) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 9, weight: .bold))
                        Text("Analizar")
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(violet, in: Capsule())
                }
                .buttonStyle(.plain)
            }

            HStack {
                Text("Análisis personalizado de hábitos y finanzas")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textFaint)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Palette.textFaint)
            }
            .padding(12)
            .background(Palette.fill(0.02), in: RoundedRectangle(cornerRadius: 10))
        }
        .padding(16)
        .background(violet.opacity(0.05), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16).stroke(violet.opacity(0.18), lineWidth: 1)
        )
    }
}
