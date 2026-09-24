import SwiftUI
#if os(macOS)
import AppKit
#endif

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
    //
    // En oscuro la página es casi negra y las tarjetas son todavía más
    // oscuras: el borde las separa. En claro hay que invertir la idea — la
    // página lleva el gris y las tarjetas son blancas —, porque cuando las
    // dos eran casi blancas no se distinguía una de otra y todo quedaba en
    // una papilla gris sin profundidad.
    static let base = Color(light: Color(hex: "#e9ebef"), dark: Color(hex: "#0a0a0a"))

    /// Fondo sólido: hojas modales y la barra lateral. Son ventanas o chrome,
    /// no contenido dentro del lienzo.
    static let surface = Color(light: .white, dark: Color(hex: "#050505"))

    /// Un contenedor grande dentro de la ventana: el panel de hábitos, una
    /// tarjeta de Finanzas.
    ///
    /// En oscuro es un velo claro y no un negro plano. Con la ventana
    /// translúcida el fondo pasa a ser gris medio, así que un `#080808`
    /// quedaba más oscuro que la página: se leía como un agujero en vez de
    /// como algo apoyado encima.
    static let panel = Color(light: .white, dark: .white.opacity(0.04))

    /// Una tarjeta suelta sobre el lienzo o dentro de una columna.
    static let surfaceRaised = Color(light: .white, dark: .white.opacity(0.085))

    /// Una fila o celda dentro de una tarjeta. En claro se hunde, porque la
    /// tarjeta ya es blanca y dos blancos no se distinguen; en oscuro sube
    /// apenas sobre el fondo de la tarjeta.
    static let nested = Color(light: Color(hex: "#f2f4f7"), dark: .white.opacity(0.06))

    /// Fondo de los campos de texto. Dentro de una tarjeta blanca tiene que
    /// hundirse un poco para leerse como campo.
    /// En oscuro es un velo más claro que la tarjeta que lo contiene, no un
    /// negro plano: sobre una tarjeta translúcida un `#111111` volvía a ser
    /// el mismo agujero que tenían las tarjetas.
    static let inputBackground = Color(light: Color(hex: "#f1f3f6"), dark: .white.opacity(0.11))

    // Líneas
    static let hairline = Color(light: .black.opacity(0.11), dark: .white.opacity(0.10))
    static let hairlineFaint = Color(light: .black.opacity(0.055), dark: .white.opacity(0.04))

    // Sombra de tarjeta. En oscuro no existe: una sombra negra sobre negro no
    // se ve y sólo ensucia. En claro es lo que levanta la tarjeta del fondo,
    // el trabajo que en oscuro hace el borde.
    static let cardShadow = Color(light: .black.opacity(0.06), dark: .clear)
    static let cardShadowSoft = Color(light: .black.opacity(0.035), dark: .clear)

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

    /// El riel vacío del anillo. En claro tenía tanto cuerpo que era lo más
    /// oscuro de la pantalla: un aro gris enorme que no dice nada tapando al
    /// que sí dice algo. Ahora la página es más gris, así que alcanza con
    /// mucho menos.
    static let ringTrack = Color(light: .black.opacity(0.055), dark: .white.opacity(0.055))

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

    /// Un resplandor que en claro directamente no existe. Sobre blanco una
    /// sombra de color no ilumina: deja un manchón rectangular alrededor del
    /// texto o de la fila, que es justo lo que se veía detrás del "33%".
    static func nightGlow(_ color: Color, _ opacity: Double) -> Color {
        Color(light: .clear, dark: color.opacity(opacity))
    }
}

extension View {
    /// Una tarjeta de la app: blanca y con sombra suave en claro, casi negra y
    /// con borde en oscuro. Los dos tokens se resuelven solos, así que la
    /// vista no tiene que saber en qué modo está.
    func cardSurface(_ cornerRadius: CGFloat = 16, raised: Bool = false) -> some View {
        background(raised ? Palette.surfaceRaised : Palette.panel,
                   in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(Palette.hairlineFaint, lineWidth: 1))
            .shadow(color: Palette.cardShadow, radius: 10, y: 3)
            .shadow(color: Palette.cardShadowSoft, radius: 2, y: 1)
    }
}

/// Colores del anillo por nivel — replican `getColors()` del tema Classic.
struct LevelColors {
    let primary: Color
    let glow: Color
    let glowRadius: CGFloat
    /// El riel vacío del anillo. Lleva el color del propio anillo, muy
    /// diluido: en claro un gris neutro terminaba siendo lo más oscuro de
    /// la pantalla — tres aros enormes que no dicen nada tapando al que sí.
    let track: Color

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
            glow: Palette.nightGlow(base, strength),
            glowRadius: radius,
            track: Color(light: base.darkened(0.3).opacity(0.12),
                         dark: .white.opacity(0.055))
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

/// Cuánto deja pasar la ventana.
///
/// El material del sistema mezcla lo que hay detrás con un velo del color
/// base; esto decide el espesor del velo. En claro pide más que en oscuro:
/// un fondo de escritorio brillante atravesando la ventana se come el texto,
/// y sobre uno pálido el efecto se nota poco por mucho que se abra.
enum Translucency: String, CaseIterable {
    case solid, medium, glass

    var label: String {
        switch self {
        case .solid:  return "Sólido"
        case .medium: return "Translúcido"
        case .glass:  return "Vidrio"
        }
    }

    var symbol: String {
        switch self {
        case .solid:  return "square.fill"
        case .medium: return "square.lefthalf.filled"
        case .glass:  return "square.on.square.dashed"
        }
    }

    #if os(macOS)
    /// `.sidebar` es el material de fondo de ventana del sistema. `.hudWindow`
    /// es el que más deja pasar, y es el único que en apariencia clara se nota
    /// de verdad: los materiales claros de macOS son casi opacos por diseño.
    var material: NSVisualEffectView.Material {
        self == .glass ? .hudWindow : .sidebar
    }
    #endif

    /// El velo no es sólo identidad: es lo que aplana las manchas. El
    /// material trae los claros y oscuros de lo que haya detrás —otra
    /// ventana, una zona brillante del fondo— y sin suficiente velo esas
    /// manchas caen justo detrás del texto.
    func veil(dark: Bool) -> Double {
        switch self {
        case .solid:  return 1
        case .medium: return dark ? 0.55 : 0.62
        case .glass:  return dark ? 0.34 : 0.42
        }
    }

    var next: Translucency {
        switch self {
        case .solid:  return .medium
        case .medium: return .glass
        case .glass:  return .solid
        }
    }
}

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
