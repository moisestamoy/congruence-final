import SwiftUI

/// Pantalla angosta: el iPhone, o una ventana de Mac achicada hasta ahí.
///
/// Se decide por el ancho y no por la plataforma a propósito. Así el diseño
/// del iPhone se puede ver y probar en la Mac sin simulador, y una ventana
/// angosta en la Mac tampoco se rompe.
private struct CompactKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var isCompact: Bool {
        get { self[CompactKey.self] }
        set { self[CompactKey.self] = newValue }
    }
}

enum Compact {
    /// Por debajo de esto no entra la barra lateral más una pantalla útil.
    static let threshold: CGFloat = 700

    #if DEBUG
    /// open Congruence.app --args -debugPhone YES
    /// Abre la ventana del tamaño de un iPhone para revisar el diseño angosto.
    static var debugPhone: Bool { UserDefaults.standard.bool(forKey: "debugPhone") }
    #endif
}

extension View {
    /// El ancho de una hoja. En la Mac las hojas flotan y necesitan un ancho
    /// fijo; en el iPhone ocupan la pantalla y un ancho fijo se saldría de ella.
    @ViewBuilder
    func sheetWidth(_ width: CGFloat) -> some View {
        #if os(macOS)
        self.frame(width: width)
        #else
        // Sin esto la hoja deja franjas blancas arriba y abajo en el iPhone:
        // el fondo de la vista no llega hasta los bordes de la hoja.
        self.frame(maxWidth: .infinity)
            .presentationBackground(Palette.base)
        #endif
    }
}

/// El botón + de la barra del teléfono. Cada pantalla mira este número y,
/// cuando sube, crea lo suyo: un hábito, un movimiento, una tarea.
private struct PhonePlusKey: EnvironmentKey {
    static let defaultValue = PhonePlus(tick: 0, dictate: false)
}

struct PhonePlus: Equatable {
    var tick: Int
    /// Mantener pulsado el + en Tareas: dictar en vez de escribir.
    var dictate: Bool
}

extension EnvironmentValues {
    var phonePlus: PhonePlus {
        get { self[PhonePlusKey.self] }
        set { self[PhonePlusKey.self] = newValue }
    }
}

extension AppSection {
    /// Si en esta sección hay algo que crear con el +.
    var hasPlus: Bool { self != .stats }
}

/// La barra de abajo del iPhone, a la manera de Bevel: una cápsula de vidrio
/// que flota sobre el contenido con las secciones (la elegida en una pastilla
/// que se desliza), y al lado un + redondo que crea lo de la sección en la
/// que estás. La cuenta es un círculo con tu inicial al final de la cápsula.
struct PhoneTabBar: View {
    @Binding var selection: AppSection
    var onLogin: () -> Void
    var onPlus: (_ dictate: Bool) -> Void = { _ in }

    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue
    @Environment(AuthService.self) private var auth
    @Environment(SyncService.self) private var sync
    @Namespace private var nav
    @State private var plusPressed = 0

    private var appearance: Appearance { Appearance(rawValue: appearanceRaw) ?? .system }

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 0) {
                tabs
                accountMenu
                    .frame(width: 40, height: 54)
            }
            .padding(5)
            .glassCapsule()

            if selection.hasPlus {
                plusButton
                    .transition(.scale(scale: 0.6).combined(with: .opacity))
            }
        }
        .padding(.horizontal, 14)
        .padding(.bottom, 4)
        .animation(.spring(response: 0.35, dampingFraction: 0.82), value: selection.hasPlus)
        .sensoryFeedback(.impact(weight: .light), trigger: selection)
        .sensoryFeedback(.selection, trigger: hovered)
        .sensoryFeedback(.impact(weight: .medium), trigger: plusPressed)
    }

    // MARK: Arrastrar por la barra

    /// Dónde está el dedo mientras se arrastra por las secciones; nil si no.
    @State private var dragX: CGFloat?
    @State private var tabsWidth: CGFloat = 0
    /// La sección bajo la lupa. Se elige al soltar, no mientras pasa: cambiar
    /// de pantalla en cada sección que cruza el dedo sería pesado y confuso.
    @State private var hovered: AppSection?

    private var tabWidth: CGFloat { tabsWidth / CGFloat(AppSection.allCases.count) }

    /// La sección que queda debajo de un punto de la barra.
    private func section(at x: CGFloat) -> AppSection {
        let all = AppSection.allCases
        guard tabWidth > 0 else { return selection }
        let i = Int((x / tabWidth).rounded(.down))
        return all[min(max(i, 0), all.count - 1)]
    }

    /// Las secciones. Se pueden tocar o recorrer con el dedo: al arrastrar
    /// aparece una lupa de vidrio que sigue el dedo, sale por encima de la
    /// barra, y al soltar te deja en la sección que tenía debajo.
    private var tabs: some View {
        HStack(spacing: 0) {
            ForEach(AppSection.allCases) { section in
                tab(section)
            }
        }
        .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { tabsWidth = $0 }
        .background(alignment: .leading) {
            if let dragX {
                let mitad = tabWidth / 2 + 6
                lens
                    .frame(width: tabWidth + 12, height: 68)
                    .position(x: min(max(dragX, mitad), tabsWidth - mitad), y: 27)
                    .transition(.scale(scale: 0.7).combined(with: .opacity))
            }
        }
        .coordinateSpace(.named("tabs"))
        .simultaneousGesture(
            DragGesture(minimumDistance: 8, coordinateSpace: .named("tabs"))
                .onChanged { g in
                    if dragX == nil {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) { dragX = g.location.x }
                    } else {
                        dragX = g.location.x
                    }
                    let debajo = section(at: g.location.x)
                    if debajo != hovered { hovered = debajo }
                }
                .onEnded { g in
                    let destino = section(at: g.location.x)
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.75)) {
                        selection = destino
                        dragX = nil
                        hovered = nil
                    }
                }
        )
    }

    /// La lupa: vidrio más grande que la barra, con un borde que brilla.
    @ViewBuilder
    private var lens: some View {
        if #available(iOS 26.0, macOS 26.0, *) {
            Capsule()
                .fill(.clear)
                .glassEffect(.regular.interactive(), in: Capsule())
                .shadow(color: .black.opacity(0.18), radius: 14, y: 6)
        } else {
            Capsule()
                .fill(.ultraThinMaterial)
                .overlay(Capsule().stroke(.white.opacity(0.6), lineWidth: 1))
                .shadow(color: .black.opacity(0.18), radius: 14, y: 6)
        }
    }

    private func tab(_ section: AppSection) -> some View {
        let activa = (dragX != nil ? hovered ?? selection : selection) == section
        let bajoLupa = dragX != nil && activa
        return Button {
            withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) { selection = section }
        } label: {
            VStack(spacing: 3) {
                Image(systemName: section.symbol)
                    .symbolVariant(activa ? .fill : .none)
                    .font(.system(size: 18, weight: activa ? .semibold : .regular))
                    .symbolEffect(.bounce, value: activa)
                    .frame(height: 22)
                Text(section.shortLabel)
                    .font(.system(size: 10, weight: activa ? .bold : .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .foregroundStyle(activa ? Palette.text : Palette.textMuted)
            // Lo que queda bajo la lupa se ve agrandado, como a través de un vidrio.
            .scaleEffect(bajoLupa ? 1.22 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: bajoLupa)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background {
                // Mientras se arrastra, la lupa reemplaza a la pastilla.
                if activa && dragX == nil {
                    Capsule()
                        .fill(Palette.fill(0.08))
                        .matchedGeometryEffect(id: "sección", in: nav)
                }
            }
            .contentShape(Capsule())
        }
        .buttonStyle(.pressable)
        .accessibilityLabel(section.label)
    }

    private var plusButton: some View {
        Image(systemName: "plus")
            .font(.system(size: 22, weight: .medium))
            .foregroundStyle(Palette.text)
            .frame(width: 64, height: 64)
            .glassCircle()
            .contentShape(Circle())
            .onTapGesture {
                plusPressed += 1
                onPlus(false)
            }
            .onLongPressGesture(minimumDuration: 0.35) {
                // En Tareas, mantener pulsado dicta.
                guard selection == .tasks, VoiceSupport.isAvailable else { return }
                plusPressed += 1
                onPlus(true)
            }
            .accessibilityLabel(plusLabel)
            .accessibilityAddTraits(.isButton)
    }

    private var plusLabel: String {
        switch selection {
        case .habits:   return "Nuevo hábito"
        case .finances: return "Nuevo movimiento"
        case .tasks:    return "Nueva tarea"
        case .stats:    return ""
        }
    }

    /// La cuenta y la apariencia juntas: son lo que la barra lateral tiene
    /// abajo, y en el teléfono no merecen un lugar cada una.
    private var accountMenu: some View {
        Menu {
            if let session = auth.session {
                Text(session.email)
                Button("Sincronizar ahora") { Task { await sync.refresh() } }
            } else {
                Button("Entrar con tu cuenta", action: onLogin)
            }
            Divider()
            Button("Apariencia: \(appearance.label)") {
                withAnimation(.smooth(duration: 0.25)) { appearanceRaw = appearance.next.rawValue }
            }
            if auth.session != nil {
                Divider()
                Button("Cerrar sesión", role: .destructive) { sync.signOut() }
            }
        } label: {
            Group {
                if let session = auth.session {
                    Text(String(session.email.prefix(1)).uppercased())
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Palette.accent)
                        .frame(width: 30, height: 30)
                        .background(Palette.accent.opacity(0.14), in: Circle())
                } else {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 22, weight: .regular))
                        .foregroundStyle(Palette.textMuted)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .accessibilityLabel(auth.session == nil ? "Entrar" : "Cuenta")
        }
        .menuStyle(.button)
        .buttonStyle(.pressable)
        #if os(macOS)
        .menuIndicator(.hidden)
        #endif
    }
}

extension AppSection {
    /// En la cápsula del teléfono no entra "Estadísticas" completo.
    var shortLabel: String { self == .stats ? "Datos" : label }
}

private extension View {
    /// Vidrio de iOS 26 si está; si no, el material translúcido de siempre.
    @ViewBuilder
    func glassCapsule() -> some View {
        if #available(iOS 26.0, macOS 26.0, *) {
            self.glassEffect(.regular, in: Capsule())
                .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
        } else {
            self.background(.regularMaterial, in: Capsule())
                .overlay(Capsule().stroke(Palette.hairline, lineWidth: 1))
                .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
        }
    }

    @ViewBuilder
    func glassCircle() -> some View {
        if #available(iOS 26.0, macOS 26.0, *) {
            self.glassEffect(.regular, in: Circle())
                .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
        } else {
            self.background(.regularMaterial, in: Circle())
                .overlay(Circle().stroke(Palette.hairline, lineWidth: 1))
                .shadow(color: .black.opacity(0.12), radius: 16, y: 6)
        }
    }
}
