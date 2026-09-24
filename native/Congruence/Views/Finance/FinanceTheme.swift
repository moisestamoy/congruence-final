import SwiftUI

/// Los colores de la página de Finanzas de la web: verde para lo que entra y
/// el acento de la página, rosa para lo que sale, turquesa para el diario.
enum FinPalette {
    static let accent = Color(light: Color(hex: "#047857"), dark: Color(hex: "#10b981"))
    static let income = Color(light: Color(hex: "#047857"), dark: Color(hex: "#34d399"))
    static let expense = Color(light: Color(hex: "#e11d48"), dark: Color(hex: "#fb7185"))
    static let daily = Color(light: Color(hex: "#0e7490"), dark: Color(hex: "#22d3ee"))
    static let recurring = Color(light: Color(hex: "#6d28d9"), dark: Color(hex: "#8b5cf6"))
    static let goal = recurring

    static func status(_ s: DayStatus) -> Color {
        switch s {
        case .solid:    return income
        case .caution:  return Color(light: Color(hex: "#b45309"), dark: Color(hex: "#fbbf24"))
        case .risk:     return Color(light: Color(hex: "#c2410c"), dark: Color(hex: "#fb923c"))
        case .critical: return expense
        }
    }
}

/// Tarjeta de la página: fondo con un leve degradé y borde fino.
struct FinCard<Content: View>: View {
    var padding: CGFloat = 20
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Palette.panel)
                    .overlay {
                        RoundedRectangle(cornerRadius: 16)
                            .fill(LinearGradient(colors: [Palette.fill(0.04), Palette.fill(0.012)],
                                                 startPoint: .topLeading, endPoint: .bottomTrailing))
                    }
            }
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.hairlineFaint, lineWidth: 1))
            .shadow(color: Palette.cardShadow, radius: 10, y: 3)
            .shadow(color: Palette.cardShadowSoft, radius: 2, y: 1)
    }
}

/// Barra fina de progreso.
struct ProgressLine: View {
    let value: Double          // 0...1
    var color: Color
    var height: CGFloat = 4

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Palette.fill(0.06))
                Capsule().fill(color).frame(width: geo.size.width * max(0, min(value, 1)))
            }
        }
        .frame(height: height)
        .animation(.smooth(duration: 0.6), value: value)
    }
}

extension DateFormatter {
    static func es(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "es")
        f.dateFormat = format
        return f
    }
}

extension String {
    /// Mayúscula sólo en la primera letra. `capitalized` pone en mayúscula cada
    /// palabra y deja cosas como "22 De Septiembre De 2026".
    var sentenceCased: String {
        guard let f = first else { return self }
        return f.uppercased() + dropFirst()
    }
}

enum FinDate {
    static func date(_ key: String) -> Date {
        HabitDay.formatter.date(from: key) ?? Date()
    }

    static func todayKey(_ now: Date = Date()) -> String {
        HabitDay.formatter.string(from: now)
    }

    static func monthTitle(_ y: Int, _ m: Int) -> String {
        let d = FinanceEngine.calendar.date(from: DateComponents(year: y, month: m, day: 1))!
        return DateFormatter.es("LLLL yyyy").string(from: d).sentenceCased
    }
}
