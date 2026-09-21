import SwiftUI

// Los mismos colores que usa la app web. Si cambian allá, cambian acá.
extension Color {
    init(hex: String) {
        let s = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        var v: UInt64 = 0
        Scanner(string: s).scanHexInt64(&v)
        let r, g, b, a: Double
        switch s.count {
        case 6:
            r = Double((v & 0xFF0000) >> 16) / 255
            g = Double((v & 0x00FF00) >> 8) / 255
            b = Double(v & 0x0000FF) / 255
            a = 1
        case 8:
            r = Double((v & 0xFF000000) >> 24) / 255
            g = Double((v & 0x00FF0000) >> 16) / 255
            b = Double((v & 0x0000FF00) >> 8) / 255
            a = Double(v & 0x000000FF) / 255
        default:
            r = 0; g = 0; b = 0; a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

enum Palette {
    // Fondos — los mismos negros de la web
    static let base = Color(hex: "#0a0a0a")
    static let surface = Color(hex: "#050505")
    static let surfaceRaised = Color(hex: "#080808")
    static let hairline = Color.white.opacity(0.10)
    static let hairlineFaint = Color.white.opacity(0.04)

    // Texto
    static let text = Color.white
    static let textMuted = Color(hex: "#a3a3a3")
    static let textFaint = Color(hex: "#525252")

    // Acento (tema Classic)
    static let accent = Color(hex: "#22d3ee")

    // Semánticos
    static let positive = Color(hex: "#34d399")
    static let negative = Color(hex: "#fb7185")
    static let warning = Color(hex: "#fbbf24")
}

/// Colores del anillo por nivel — replican `getColors()` del tema Classic.
struct LevelColors {
    let primary: Color
    let glow: Color
    let glowRadius: CGFloat

    static func forLevel(_ level: Int) -> LevelColors {
        switch level {
        case 2:  return LevelColors(primary: Color(hex: "#06b6d4"), glow: Color(hex: "#06b6d4").opacity(0.5), glowRadius: 5)
        case 3:  return LevelColors(primary: Color(hex: "#d946ef"), glow: Color(hex: "#d946ef").opacity(0.6), glowRadius: 14)
        case 4:  return LevelColors(primary: Color(hex: "#fbbf24"), glow: Color(hex: "#fbbf24").opacity(0.8), glowRadius: 16)
        case 5:  return LevelColors(primary: Color(hex: "#38bdf8"), glow: Color(hex: "#38bdf8").opacity(0.8), glowRadius: 18)
        case 6:  return LevelColors(primary: Color(hex: "#e2e8f0"), glow: Color.white.opacity(0.9), glowRadius: 22)
        default: return LevelColors(primary: Color(hex: "#2dd4bf"), glow: Color(hex: "#2dd4bf").opacity(0.25), glowRadius: 4)
        }
    }
}

extension Font {
    /// Etiquetas chiquitas en mayúscula con tracking — la firma tipográfica de la app.
    static func microLabel(_ size: CGFloat = 9) -> Font {
        .system(size: size, weight: .bold, design: .default)
    }
}

extension View {
    /// Etiqueta micro: 9px, bold, mayúsculas, tracking ancho.
    func microLabelStyle(_ color: Color = Palette.textFaint, size: CGFloat = 9) -> some View {
        self.font(.microLabel(size))
            .tracking(1.6)
            .textCase(.uppercase)
            .foregroundStyle(color)
    }
}
