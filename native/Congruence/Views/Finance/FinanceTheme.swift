import SwiftUI

/// Los colores de la página de Finanzas de la web: verde para lo que entra y
/// el acento de la página, rosa para lo que sale, turquesa para el diario.
enum FinPalette {
    static let accent = Color(hex: "#10b981")
    static let income = Color(hex: "#34d399")
    static let expense = Color(hex: "#fb7185")
    static let daily = Color(hex: "#22d3ee")
    static let recurring = Color(hex: "#8b5cf6")
    static let goal = Color(hex: "#8b5cf6")

    static func status(_ s: DayStatus) -> Color {
        switch s {
        case .solid:    return Color(hex: "#34d399")
        case .caution:  return Color(hex: "#fbbf24")
        case .risk:     return Color(hex: "#fb923c")
        case .critical: return Color(hex: "#fb7185")
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
            .background(
                LinearGradient(colors: [Color.white.opacity(0.04), Color.white.opacity(0.01)],
                               startPoint: .topLeading, endPoint: .bottomTrailing),
                in: RoundedRectangle(cornerRadius: 16)
            )
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.07), lineWidth: 1))
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
                Capsule().fill(Color.white.opacity(0.05))
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

enum FinDate {
    static func date(_ key: String) -> Date {
        HabitDay.formatter.date(from: key) ?? Date()
    }

    static func todayKey(_ now: Date = Date()) -> String {
        HabitDay.formatter.string(from: now)
    }

    static func monthTitle(_ y: Int, _ m: Int) -> String {
        let d = FinanceEngine.calendar.date(from: DateComponents(year: y, month: m, day: 1))!
        return DateFormatter.es("LLLL yyyy").string(from: d).capitalized
    }
}
