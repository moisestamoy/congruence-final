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
        self.frame(maxWidth: .infinity)
        #endif
    }
}

/// La barra de abajo del iPhone: las cuatro secciones y la cuenta. Es lo que
/// en la Mac hace la barra lateral, girado para que quede bajo el pulgar.
struct PhoneTabBar: View {
    @Binding var selection: AppSection
    var onLogin: () -> Void

    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue
    @Environment(AuthService.self) private var auth
    @Environment(SyncService.self) private var sync

    private var appearance: Appearance { Appearance(rawValue: appearanceRaw) ?? .system }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppSection.allCases) { section in
                let activa = selection == section
                Button {
                    selection = section
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: section.symbol)
                            .font(.system(size: 17, weight: .medium))
                        Text(section.label)
                            .font(.system(size: 9, weight: .semibold))
                            .lineLimit(1)
                    }
                    .foregroundStyle(activa ? Palette.accent : Palette.textFaint)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            accountMenu
                .frame(maxWidth: .infinity, minHeight: 48)
        }
        .padding(.horizontal, 6)
        .padding(.top, 6)
        .background {
            Rectangle()
                .fill(.bar)
                .ignoresSafeArea(edges: .bottom)
                .overlay(alignment: .top) {
                    Rectangle().fill(Palette.hairlineFaint).frame(height: 1)
                }
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
            VStack(spacing: 4) {
                if let session = auth.session {
                    Text(String(session.email.prefix(1)).uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(Palette.accent)
                        .frame(width: 22, height: 22)
                        .background(Palette.accent.opacity(0.12), in: Circle())
                } else {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(Palette.positive)
                }
                Text(auth.session == nil ? "Entrar" : "Cuenta")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Palette.textFaint)
            }
            .contentShape(Rectangle())
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        #if os(macOS)
        .menuIndicator(.hidden)
        #endif
    }
}
