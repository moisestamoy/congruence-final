import Charts
import SwiftUI

/// Estadísticas: el mismo contenido que la web (`StatsPage.tsx`), en cuatro
/// bloques — pulso, evolución, hábitos en detalle y patrones.
///
/// Queda fuera el Coach con IA de la web: necesita una clave de API, y las
/// claves no viven en el código de esta app.
struct StatsView: View {
    @Environment(HabitStore.self) private var store
    @Environment(\.isCompact) private var isCompact
    @AppStorage("stats.period") private var periodRaw = StatsEngine.Period.week.rawValue

    private var period: StatsEngine.Period { .init(rawValue: periodRaw) ?? .week }

    /// Los gráficos se construyen al entrar y al cambiar de período: la
    /// curva se dibuja, las barras crecen, los días se encienden.
    @State private var built = false

    private var engine: StatsEngine {
        StatsEngine(habits: store.habits,
                    congruence: { store.congruence(on: $0) },
                    today: HabitDay.current())
    }

    var body: some View {
        let e = engine
        let dias = e.pastDays(period)

        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                header
                periodPicker

                if e.allDays.isEmpty {
                    empty
                } else {
                    pulse(e, dias)
                    evolution(e)
                    habitsDetail(e, dias)
                    patterns(e)
                }
            }
            .padding(isCompact ? 16 : 28)
            .frame(maxWidth: 980, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .onAppear(perform: build)
        .onChange(of: periodRaw) { _, _ in build() }
    }

    private func build() {
        built = false
        DispatchQueue.main.async {
            withAnimation(.easeOut(duration: 1.0)) { built = true }
        }
    }

    // MARK: - Encabezado

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(DateFormatter.es("EEEE, d 'de' MMMM 'de' yyyy").string(from: Date()).sentenceCased)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.textMuted)
            Text("Estadísticas")
                .font(.system(size: 34, weight: .black))
                .tracking(-0.8)
                .foregroundStyle(Palette.text)
        }
    }

    private var periodPicker: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 16) {
                ForEach(StatsEngine.Period.allCases) { p in
                    FilterLabel(text: p.label, isSelected: period == p, tint: Palette.accent) {
                        withAnimation(.smooth(duration: 0.25)) { periodRaw = p.rawValue }
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
    }

    // MARK: - Pulso

    private func pulse(_ e: StatsEngine, _ dias: [Date]) -> some View {
        HStack(spacing: isCompact ? 8 : 14) {
            tile("Congruencia", "\(e.average(dias))%", "promedio del período", accent: true)
                .staggeredAppear(0)
            tile("Días activos", "\(e.activeDays(dias))", "de \(dias.count) días")
                .staggeredAppear(1)
            tile("Racha actual", "\(e.streak)d", "días consecutivos")
                .staggeredAppear(2)
        }
        // Las tres a la altura de la más alta.
        .fixedSize(horizontal: false, vertical: true)
    }

    private func tile(_ label: String, _ value: String, _ sub: String,
                      accent: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            Text(value)
                .font(.system(size: isCompact ? 24 : 30, weight: .black))
                .monospacedDigit()
                .foregroundStyle(accent ? Palette.accent : Palette.text)
                .contentTransition(.numericText())
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(sub)
                .font(.system(size: isCompact ? 10 : 11))
                .foregroundStyle(Palette.textFaint)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(isCompact ? 12 : 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .cardSurface(14)
    }

    // MARK: - Evolución

    private func evolution(_ e: StatsEngine) -> some View {
        let puntos = e.chart(period)
        return section("Evolución") {
            Chart(puntos) { p in
                AreaMark(x: .value("Día", p.label), y: .value("Congruencia", p.value))
                    .foregroundStyle(LinearGradient(colors: [Palette.accent.opacity(0.35),
                                                             Palette.accent.opacity(0.02)],
                                                    startPoint: .top, endPoint: .bottom))
                    .interpolationMethod(.monotone)
                LineMark(x: .value("Día", p.label), y: .value("Congruencia", p.value))
                    .foregroundStyle(Palette.accent)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                    .interpolationMethod(.monotone)
            }
            .chartYScale(domain: 0...100)
            .chartYAxis {
                AxisMarks(values: [0, 50, 100]) { v in
                    AxisGridLine().foregroundStyle(Palette.hairlineFaint)
                    AxisValueLabel { Text("\(v.as(Int.self) ?? 0)%").font(.system(size: 9)) }
                }
            }
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel().font(.system(size: 9))
                }
            }
            .chartPlotStyle { plot in
                plot.mask(alignment: .leading) {
                    GeometryReader { g in Rectangle().frame(width: g.size.width * (built ? 1 : 0)) }
                }
            }
            .frame(height: 190)
        }
    }

    // MARK: - Hábitos en detalle

    private func habitsDetail(_ e: StatsEngine, _ dias: [Date]) -> some View {
        section("Hábitos en detalle") {
            VStack(spacing: 2) {
                ForEach(e.habitStats(dias)) { s in
                    if isCompact {
                        compactHabitRow(s)
                    } else {
                        HStack(spacing: 14) {
                            if let icon = s.habit.icon, !icon.isEmpty {
                                Text(icon).font(.system(size: 14))
                            }
                            Text(s.habit.title)
                                .font(.system(size: 12, weight: .bold))
                                .tracking(1)
                                .textCase(.uppercase)
                                .foregroundStyle(Palette.text)
                                .lineLimit(1)
                            Spacer(minLength: 10)
                            sparkline(s.sparkline, tint: .tint(s.habit.color))
                            VStack(alignment: .trailing, spacing: 1) {
                                Text("racha \(s.currentStreak) · récord \(s.recordStreak)")
                                    .font(.system(size: 9, design: .monospaced))
                                    .foregroundStyle(Palette.textFaint)
                            }
                            .frame(width: 118, alignment: .trailing)
                            Text("\(s.rate)%")
                                .font(.system(size: 15, weight: .bold))
                                .monospacedDigit()
                                .foregroundStyle(s.rate >= 70 ? Palette.positive
                                                 : s.rate >= 40 ? Palette.warning : Palette.textMuted)
                                .frame(width: 46, alignment: .trailing)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 4)
                    }
                }
            }
        }
    }

    /// En el teléfono la fila va en dos líneas: el nombre y el porcentaje
    /// arriba, los catorce días y la racha abajo.
    private func compactHabitRow(_ s: StatsEngine.HabitStat) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                if let icon = s.habit.icon, !icon.isEmpty {
                    Text(icon).font(.system(size: 14))
                }
                Text(s.habit.title)
                    .font(.system(size: 12, weight: .bold))
                    .tracking(1)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.text)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text("\(s.rate)%")
                    .font(.system(size: 15, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(s.rate >= 70 ? Palette.positive
                                     : s.rate >= 40 ? Palette.warning : Palette.textMuted)
            }
            HStack {
                sparkline(s.sparkline, tint: .tint(s.habit.color))
                Spacer()
                Text("racha \(s.currentStreak) · récord \(s.recordStreak)")
                    .font(.system(size: 9, design: .monospaced))
                    .foregroundStyle(Palette.textFaint)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 4)
    }

    /// Los últimos 14 días de un hábito: lleno cumplido, medio en pausa, un
    /// trazo fallado, apenas visible sin registro.
    private func sparkline(_ marks: [StatsEngine.Mark], tint: Color) -> some View {
        HStack(spacing: 2) {
            ForEach(Array(marks.enumerated()), id: \.offset) { i, m in
                Capsule()
                    .fill(color(for: m, tint: tint))
                    .frame(width: 5, height: m == .done ? 14 : m == .paused ? 9 : 5)
                    .scaleEffect(y: built ? 1 : 0.1, anchor: .bottom)
                    .opacity(built ? 1 : 0)
                    .animation(.spring(response: 0.4, dampingFraction: 0.7)
                        .delay(Double(i) * 0.03), value: built)
            }
        }
        .frame(height: 14, alignment: .bottom)
    }

    private func color(for m: StatsEngine.Mark, tint: Color) -> Color {
        switch m {
        case .done:   return tint.opacity(0.9)
        case .paused: return Palette.warning.opacity(0.6)
        case .missed: return Palette.negative.opacity(0.45)
        case .empty:  return Palette.fill(0.10)
        }
    }

    // MARK: - Patrones

    @ViewBuilder
    private func patterns(_ e: StatsEngine) -> some View {
        if e.allDays.count < 7 || store.habits.isEmpty {
            section("Patrones") {
                Text("Aparecen con una semana de historial. Llevas \(e.allDays.count) día\(e.allDays.count == 1 ? "" : "s").")
                    .font(.system(size: 13, design: .serif))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .padding(.vertical, 6)
            }
        } else {
            section("Patrones · todo el historial") {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14),
                                         count: isCompact ? 1 : 2), spacing: 14) {
                    dayOfWeekCard(e)
                    trendCard(e)
                    if let mejor = e.bestWeek {
                        let reciente = HabitDay.adding(-7, to: HabitDay.current()) <= mejor.start
                        insight("Récord histórico", "\(mejor.avg)%",
                                "la semana del \(DateFormatter.es("d 'de' MMM").string(from: mejor.start))")
                            .overlay { if reciente { RecordTrace() } }
                    }
                    if let s = e.solidity {
                        insight("Más sólido", s.solid.title.capitalized,
                                "el que menos días seguidos falla")
                        if s.unstable.id != s.solid.id {
                            insight("Más inconsistente", s.unstable.title.capitalized,
                                    "el de la racha de fallos más larga")
                        }
                    }
                    pausesCard(e)
                }
            }
        }
    }

    private func dayOfWeekCard(_ e: StatsEngine) -> some View {
        let datos = e.dayOfWeek
        let validos = datos.compactMap { d in d.avg.map { (d.label, $0) } }
        let mejor = validos.max { $0.1 < $1.1 }
        let peor = validos.min { $0.1 < $1.1 }
        return card {
            Text("Por día de la semana").microLabelStyle(Palette.textFaint, size: 9)
            Chart(Array(datos.enumerated()), id: \.offset) { _, d in
                BarMark(x: .value("Día", d.label), y: .value("Promedio", built ? (d.avg ?? 0) : 0))
                    .foregroundStyle(d.label == mejor?.0 ? Palette.positive
                                     : d.label == peor?.0 ? Palette.negative.opacity(0.7)
                                     : Palette.accent.opacity(0.45))
                    .cornerRadius(3)
            }
            .chartYScale(domain: 0...100)
            .chartYAxis(.hidden)
            .frame(height: 90)
            if validos.count >= 3, let mejor, let peor, mejor.0 != peor.0 {
                Text("Mejor los \(mejor.0.lowercased()) (\(mejor.1)%), peor los \(peor.0.lowercased()) (\(peor.1)%).")
                    .font(.system(size: 11))
                    .foregroundStyle(Palette.textMuted)
            }
        }
    }

    private func trendCard(_ e: StatsEngine) -> some View {
        let semanas = e.weekTrend
        let sube = semanas[3] > semanas[0] && semanas[3] > 0
        return card {
            Text("Últimas 4 semanas").microLabelStyle(Palette.textFaint, size: 9)
            HStack(alignment: .bottom, spacing: 8) {
                ForEach(Array(semanas.enumerated()), id: \.offset) { i, v in
                    VStack(spacing: 4) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(i == 3 ? Palette.accent : Palette.accent.opacity(0.35))
                            .frame(height: built ? max(4, CGFloat(v) * 0.8) : 4)
                            .animation(.spring(response: 0.5, dampingFraction: 0.72)
                                .delay(Double(i) * 0.08), value: built)
                        Text("\(v)%").font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(Palette.textFaint)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 100, alignment: .bottom)
            Text(sube ? "Subiendo respecto de hace un mes." : "Sin mejora respecto de hace un mes.")
                .font(.system(size: 11))
                .foregroundStyle(sube ? Palette.positive : Palette.textMuted)
        }
    }

    @ViewBuilder
    private func pausesCard(_ e: StatsEngine) -> some View {
        let p = e.pauses
        if let hab = p.mostPaused {
            card {
                Text("Pausas").microLabelStyle(Palette.textFaint, size: 9)
                Text("\(hab.icon ?? "") \(hab.title.capitalized)")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Palette.text)
                Text("el que más pausas tuvo (\(hab.count))")
                    .font(.system(size: 11)).foregroundStyle(Palette.textMuted)
                if let r = p.topReason {
                    Text("Motivo más repetido: \(r.text) (\(r.count) de \(r.total))")
                        .font(.system(size: 11)).foregroundStyle(Palette.textMuted)
                }
                if let d = p.worstDay {
                    Text("Más pausas los \(d.label)")
                        .font(.system(size: 11)).foregroundStyle(Palette.textMuted)
                }
            }
        }
    }

    private func insight(_ label: String, _ value: String, _ sub: String) -> some View {
        card {
            Text(label).microLabelStyle(Palette.textFaint, size: 9)
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Palette.text)
                .lineLimit(1)
            Text(sub).font(.system(size: 11)).foregroundStyle(Palette.textMuted)
        }
    }

    // MARK: - Piezas

    private func card<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 8, content: content)
            .padding(16)
            .frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)
            .cardSurface(14)
    }

    private func section<C: View>(_ title: String, @ViewBuilder _ content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).microLabelStyle(Palette.textMuted, size: 10)
            content()
        }
    }

    private var empty: some View {
        Text("Todavía no hay registros. Marca un hábito hoy y esto empieza a llenarse.")
            .font(.system(size: 15, weight: .light, design: .serif))
            .italic()
            .foregroundStyle(Palette.textFaint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 60)
    }
}


/// Un récord nuevo: una línea recorre el borde de la tarjeta una vez y se
/// queda como un contorno tenue.
private struct RecordTrace: View {
    @State private var trazo: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: 14)
            .trim(from: 0, to: trazo)
            .stroke(Palette.accent, style: StrokeStyle(lineWidth: 1.5, lineCap: .round))
            .opacity(trazo >= 1 ? 0.45 : 1)
            .allowsHitTesting(false)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.6).delay(0.4)) { trazo = 1 }
            }
    }
}
