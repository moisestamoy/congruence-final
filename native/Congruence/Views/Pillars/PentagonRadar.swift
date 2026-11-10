import SwiftUI

/// Cinco valores que se animan juntos (los puntajes de los pilares, de 0 a 1).
struct FiveValues: VectorArithmetic {
    var v: [Double] = [0, 0, 0, 0, 0]

    init(_ values: [Double] = []) {
        for i in 0..<5 { v[i] = i < values.count ? values[i] : 0 }
    }

    static var zero: FiveValues { FiveValues() }
    static func + (a: FiveValues, b: FiveValues) -> FiveValues { FiveValues(zip(a.v, b.v).map(+)) }
    static func - (a: FiveValues, b: FiveValues) -> FiveValues { FiveValues(zip(a.v, b.v).map(-)) }
    mutating func scale(by rhs: Double) { v = v.map { $0 * rhs } }
    var magnitudeSquared: Double { v.reduce(0) { $0 + $1 * $1 } }
}

/// Un pentágono cuyos vértices están a `values[i]` del centro (0 a 1).
/// El primer eje apunta arriba y siguen en sentido horario.
struct PentagonShape: Shape {
    var values: FiveValues

    var animatableData: FiveValues {
        get { values }
        set { values = newValue }
    }

    static func point(_ i: Int, _ t: Double, in rect: CGRect) -> CGPoint {
        let r = min(rect.width, rect.height) / 2
        let angle = -Double.pi / 2 + Double(i) * 2 * .pi / 5
        return CGPoint(x: rect.midX + cos(angle) * r * t, y: rect.midY + sin(angle) * r * t)
    }

    func path(in rect: CGRect) -> Path {
        var path = Path()
        for i in 0..<5 {
            let p = Self.point(i, values.v[i], in: rect)
            if i == 0 { path.move(to: p) } else { path.addLine(to: p) }
        }
        path.closeSubpath()
        return path
    }
}

/// Los cinco pilares en un pentágono: trazo lleno = dónde estás, punteado = a
/// dónde vas. Con `labels`, cada punta lleva el nombre y el puntaje, y tocarla
/// abre ese pilar.
struct PentagonRadar: View {
    let scoresA: [Int]
    let scoresB: [Int]
    var labels = true
    var onSelect: (PillarId) -> Void = { _ in }

    @State private var appeared = false

    private func unit(_ scores: [Int]) -> FiveValues {
        FiveValues(scores.map { Double(min(10, max(0, $0))) / 10 })
    }

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            // Con etiquetas, el pentágono deja lugar alrededor para ellas.
            let inset = labels ? side * 0.17 : 2
            let rect = CGRect(x: (geo.size.width - side) / 2 + inset, y: (geo.size.height - side) / 2 + inset,
                              width: side - inset * 2, height: side - inset * 2)

            ZStack {
                ForEach([0.25, 0.5, 0.75, 1.0], id: \.self) { t in
                    PentagonShape(values: FiveValues(Array(repeating: t, count: 5)))
                        .stroke(Palette.hairline.opacity(0.7), lineWidth: 1)
                }
                PentagonShape(values: appeared ? unit(scoresB) : .zero)
                    .stroke(Palette.textMuted.opacity(0.7), style: StrokeStyle(lineWidth: 1, dash: [3, 5]))
                PentagonShape(values: appeared ? unit(scoresA) : .zero)
                    .fill(Palette.accent.opacity(0.12))
                PentagonShape(values: appeared ? unit(scoresA) : .zero)
                    .stroke(Palette.accent, style: StrokeStyle(lineWidth: labels ? 2.5 : 1.5, lineJoin: .round))
                    .shadow(color: Palette.nightGlow(Palette.accent, 0.35), radius: 8)
            }
            .frame(width: rect.width, height: rect.height)
            .position(x: rect.midX, y: rect.midY)
            .animation(.spring(response: 0.6, dampingFraction: 0.78), value: scoresA)
            .animation(.spring(response: 0.6, dampingFraction: 0.78), value: scoresB)

            if labels {
                ForEach(Array(PillarId.allCases.enumerated()), id: \.element) { i, id in
                    let p = PentagonShape.point(i, 1.3, in: rect)
                    Button { onSelect(id) } label: {
                        VStack(spacing: 2) {
                            Text(id.label).microLabelStyle(Palette.textMuted, size: 9)
                            (Text("\(scoresA[i])").foregroundStyle(Palette.text).fontWeight(.heavy)
                             + Text(" / \(scoresB[i])").foregroundStyle(Palette.textFaint))
                                .font(.system(size: 11))
                                .monospacedDigit()
                        }
                        .frame(width: 84, height: 36)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.pressable)
                    .position(x: p.x, y: p.y)
                    .accessibilityLabel("\(id.label), \(scoresA[i]) de \(scoresB[i])")
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.72)) { appeared = true }
        }
    }
}
