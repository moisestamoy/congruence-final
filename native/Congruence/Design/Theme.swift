import SwiftUI

#if os(macOS)
import AppKit
typealias PlatformColor = NSColor
#else
import UIKit
typealias PlatformColor = UIColor
#endif

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

    /// Un color que se resuelve solo según la apariencia del sistema. Es lo que
    /// permite tener modo claro sin tocar cada vista: los tokens de `Palette`
    /// ya saben qué valor tomar en cada modo.
    init(light: Color, dark: Color) {
        #if os(macOS)
        self.init(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
            return NSColor(isDark ? dark : light)
        })
        #else
        self.init(uiColor: UIColor { traits in
            UIColor(traits.userInterfaceStyle == .dark ? dark : light)
        })
        #endif
    }

    /// Mezcla hacia el negro. Sirve para que un color pensado sobre fondo
    /// oscuro siga leyéndose sobre blanco.
    func darkened(_ amount: Double) -> Color {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 1
        #if os(macOS)
        if let c = NSColor(self).usingColorSpace(.sRGB) {
            r = c.redComponent; g = c.greenComponent; b = c.blueComponent; a = c.alphaComponent
        }
        #else
        UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a)
        #endif
        let f = 1 - amount
        return Color(.sRGB, red: Double(r) * f, green: Double(g) * f, blue: Double(b) * f,
                     opacity: Double(a))
    }

    /// Un color de dato (el color de un hábito, el de una categoría) preparado
    /// para los dos modos: tal cual en oscuro, más profundo en claro.
    static func tint(_ hex: String) -> Color {
        let base = Color(hex: hex)
        return Color(light: base.darkened(0.3), dark: base)
    }
}

enum Palette {
    // Fondos
    static let base = Color(light: Color(hex: "#f6f6f7"), dark: Color(hex: "#0a0a0a"))
    static let surface = Color(light: .white, dark: Color(hex: "#050505"))
    static let surfaceRaised = Color(light: Color(hex: "#f2f3f5"), dark: Color(hex: "#080808"))

    /// Fondo de los campos de texto.
    static let inputBackground = Color(light: Color(hex: "#f1f2f4"), dark: Color(hex: "#111111"))

    // Líneas
    static let hairline = Color(light: .black.opacity(0.13), dark: .white.opacity(0.10))
    static let hairlineFaint = Color(light: .black.opacity(0.07), dark: .white.opacity(0.04))

    // Texto
    static let text = Color(light: Color(hex: "#111114"), dark: .white)
    static let textMuted = Color(light: Color(hex: "#5b5f66"), dark: Color(hex: "#a3a3a3"))
    static let textFaint = Color(light: Color(hex: "#8a8f98"), dark: Color(hex: "#525252"))

    // Acento y semánticos
    static let accent = Color(light: Color(hex: "#0e8fa8"), dark: Color(hex: "#22d3ee"))
    static let positive = Color(light: Color(hex: "#047857"), dark: Color(hex: "#34d399"))
    static let negative = Color(light: Color(hex: "#e11d48"), dark: Color(hex: "#fb7185"))
    static let warning = Color(light: Color(hex: "#b45309"), dark: Color(hex: "#fbbf24"))

    /// Texto sobre el color de acento. En oscuro el acento es brillante y pide
    /// texto negro; en claro es profundo y pide blanco. Nunca al revés.
    static let onAccent = Color(light: .white, dark: .black)

    /// El riel vacío del anillo. Necesita más cuerpo en claro: un velo tenue
    /// sobre blanco desaparece, y el anillo es lo primero que mirás.
    static let ringTrack = Color(light: .black.opacity(0.10), dark: .white.opacity(0.055))

    /// Un velo sobre el fondo: blanco en oscuro, negro en claro. Reemplaza a los
    /// `Color.white.opacity(…)` sueltos, que en modo claro desaparecían.
    static func fill(_ opacity: Double) -> Color {
        Color(light: .black.opacity(opacity * 0.75), dark: .white.opacity(opacity))
    }

    /// Los resplandores son de la noche: en claro casi no se ven, porque sobre
    /// blanco ensucian en vez de iluminar.
    static func glow(_ color: Color, _ opacity: Double) -> Color {
        Color(light: color.opacity(opacity * 0.22), dark: color.opacity(opacity))
    }
}

/// Colores del anillo por nivel — replican `getColors()` del tema Classic.
struct LevelColors {
    let primary: Color
    let glow: Color
    let glowRadius: CGFloat

    static func forLevel(_ level: Int) -> LevelColors {
        let (hex, strength, radius): (String, Double, CGFloat) = {
            switch level {
            case 2:  return ("#06b6d4", 0.5, 5)
            case 3:  return ("#d946ef", 0.6, 14)
            case 4:  return ("#fbbf24", 0.8, 16)
            case 5:  return ("#38bdf8", 0.8, 18)
            case 6:  return ("#e2e8f0", 0.9, 22)
            default: return ("#2dd4bf", 0.25, 4)
            }
        }()
        let base = Color(hex: hex)
        return LevelColors(
            primary: .tint(hex),
            glow: Palette.glow(base, strength),
            glowRadius: radius
        )
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

// MARK: - Apariencia elegida por vos

enum Appearance: String, CaseIterable {
    case system, dark, light

    var label: String {
        switch self {
        case .system: return "Sistema"
        case .dark:   return "Oscuro"
        case .light:  return "Claro"
        }
    }

    var symbol: String {
        switch self {
        case .system: return "circle.lefthalf.filled"
        case .dark:   return "moon.fill"
        case .light:  return "sun.max.fill"
        }
    }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .dark:   return .dark
        case .light:  return .light
        }
    }

    var next: Appearance {
        switch self {
        case .system: return .dark
        case .dark:   return .light
        case .light:  return .system
        }
    }
}
