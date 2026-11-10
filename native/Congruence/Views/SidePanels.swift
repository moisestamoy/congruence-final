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
            .cardSurface(Radius.card)
    }
}

/// Los pilares en chico: el pentágono, el promedio y cuántos van hoy.
/// Tocarla abre la pantalla de Pilares.
struct PillarsCard: View {
    @Environment(PillarStore.self) private var pillars
    @Environment(HabitStore.self) private var habits

    var body: some View {
        let day = HabitDay.key(HabitDay.current())
        let foco = pillars.inFocus
        let hechos = foco.filter { pillars.isDone($0, on: day, habits: habits) }.count
        let lejos = pillars.furthest

        PanelCard {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    PanelHeader(title: "Tus pilares")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Palette.textFaint)
                }
                .padding(.bottom, 16)

                HStack(spacing: 18) {
                    PentagonRadar(scoresA: PillarId.allCases.map { pillars.pillar($0).scoreA },
                                  scoresB: PillarId.allCases.map { pillars.pillar($0).scoreB },
                                  labels: false)
                        .frame(width: 92, height: 92)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(String(format: "%.1f", pillars.average))
                            .font(.system(size: 34, weight: .heavy))
                            .monospacedDigit()
                            .foregroundStyle(Palette.text)
                        Text("Equilibrio").microLabelStyle(Palette.accent, size: 9)
                        Text("\(hechos) de \(foco.count) hoy")
                            .font(.system(size: 11, weight: .medium))
                            .monospacedDigit()
                            .foregroundStyle(Palette.textMuted)
                            .padding(.top, 6)
                    }
                    Spacer(minLength: 0)
                }

                if pillars.document.isBlank {
                    Text("Define dónde estás y a dónde vas en cada uno.")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint)
                        .padding(.top, 14)
                } else if lejos.gap > 0 {
                    (Text("Lo más lejos de tu meta: ").foregroundStyle(Palette.textFaint)
                     + Text(lejos.id.label).foregroundStyle(Palette.text).fontWeight(.semibold))
                        .font(.system(size: 11))
                        .padding(.top, 14)
                }
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityLabel("Tus pilares, equilibrio \(String(format: "%.1f", pillars.average)), \(hechos) de \(foco.count) hoy")
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
                    .background(violet.opacity(0.12), in: RoundedRectangle(cornerRadius: Radius.inner))

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
                .buttonStyle(.pressable)
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
            .background(Palette.fill(0.02), in: RoundedRectangle(cornerRadius: Radius.control))
        }
        .padding(16)
        .background(violet.opacity(0.05), in: RoundedRectangle(cornerRadius: Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: Radius.card).stroke(violet.opacity(0.18), lineWidth: 1)
        )
    }
}
