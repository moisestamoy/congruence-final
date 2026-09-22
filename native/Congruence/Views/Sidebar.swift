import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case habits, finances, tasks, stats

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .habits:   return "square.grid.2x2"
        case .finances: return "wallet.bifold"
        case .tasks:    return "checkmark.square"
        case .stats:    return "chart.pie"
        }
    }

    var label: String {
        switch self {
        case .habits:   return "Hábitos"
        case .finances: return "Finanzas"
        case .tasks:    return "Tareas"
        case .stats:    return "Estadísticas"
        }
    }
}

/// El logo: una versión chiquita del anillo. Es la misma idea a otra escala.
struct RingMark: View {
    var size: CGFloat = 26
    var color: Color = Palette.accent

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .stroke(color.opacity(1 - Double(i) * 0.28), lineWidth: size * 0.09)
                    .frame(width: size - CGFloat(i) * size * 0.3,
                           height: size - CGFloat(i) * size * 0.3)
            }
            Circle()
                .fill(color)
                .frame(width: size * 0.16, height: size * 0.16)
        }
        .frame(width: size, height: size)
        .shadow(color: Palette.glow(color, 0.6), radius: size * 0.3)
    }
}

struct Sidebar: View {
    @Binding var selection: AppSection
    var onLogin: () -> Void = {}

    @AppStorage("appearance") private var appearanceRaw = Appearance.system.rawValue
    @Environment(AuthService.self) private var auth
    @Environment(SyncService.self) private var sync
    @AppStorage("translucency") private var translucencyRaw = Translucency.medium.rawValue

    private var translucency: Translucency {
        Translucency(rawValue: translucencyRaw) ?? .medium
    }

    var body: some View {
        VStack(spacing: 0) {
            RingMark(size: 26)
                .padding(.top, 22)
                .padding(.bottom, 26)

            VStack(spacing: 6) {
                ForEach(AppSection.allCases) { section in
                    navButton(section)
                }
            }

            Spacer()

            appearanceButton
                .padding(.bottom, 6)

            #if os(macOS)
            translucencyButton
                .padding(.bottom, 10)
            #endif

            accountButton
                .padding(.bottom, 18)
        }
        .frame(width: 72)
        .frame(maxHeight: .infinity)
        .background(Palette.surface.opacity(0.55))
        .overlay(alignment: .trailing) {
            Rectangle()
                .fill(Palette.hairlineFaint)
                .frame(width: 1)
        }
    }

    // MARK: - Apariencia

    private var appearance: Appearance { Appearance(rawValue: appearanceRaw) ?? .system }

    #if os(macOS)
    private var translucencyButton: some View {
        Button {
            withAnimation(.smooth(duration: 0.3)) { translucencyRaw = translucency.next.rawValue }
        } label: {
            Image(systemName: translucency.symbol)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 30, height: 30)
                .background(Palette.fill(0.04), in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Palette.hairlineFaint, lineWidth: 1))
                .contentTransition(.symbolEffect(.replace))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help("Fondo: \(translucency.label) · clic para cambiar")
    }
    #endif

    private var appearanceButton: some View {
        Button {
            withAnimation(.smooth(duration: 0.25)) { appearanceRaw = appearance.next.rawValue }
        } label: {
            Image(systemName: appearance.symbol)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 30, height: 30)
                .background(Palette.fill(0.04), in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Palette.hairlineFaint, lineWidth: 1))
                .contentTransition(.symbolEffect(.replace))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help("Apariencia: \(appearance.label) · clic para cambiar")
    }

    // MARK: - Cuenta y estado de sincronización

    @ViewBuilder
    private var accountButton: some View {
        if let session = auth.session {
            Menu {
                Text(session.email)
                Text(statusText)
                Divider()
                Button("Sincronizar ahora") { Task { await sync.refresh() } }
                Button("Cerrar sesión", role: .destructive) { sync.signOut() }
            } label: {
                ZStack(alignment: .bottomTrailing) {
                    Text(String(session.email.prefix(1)).uppercased())
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Palette.accent)
                        .frame(width: 30, height: 30)
                        .background(Palette.accent.opacity(0.10), in: Circle())
                        .overlay(Circle().stroke(Palette.accent.opacity(0.25), lineWidth: 1))
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                        .overlay(Circle().stroke(Palette.surface, lineWidth: 2))
                }
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .fixedSize()
            .help(statusText)
        } else {
            Button(action: onLogin) {
                Image(systemName: "arrow.right.square")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.positive)
                    .frame(width: 30, height: 30)
                    .background(Palette.positive.opacity(0.08), in: RoundedRectangle(cornerRadius: 9))
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("Entrar con tu cuenta")
        }
    }

    private var statusColor: Color {
        switch sync.status {
        case .synced:    return Palette.positive
        case .syncing:   return Palette.accent
        case .error:     return Palette.negative
        case .signedOut: return Palette.textFaint
        }
    }

    private var statusText: String {
        switch sync.status {
        case .synced(let date):
            let f = DateFormatter()
            f.locale = Locale(identifier: "es")
            f.timeStyle = .short
            return "Sincronizado · \(f.string(from: date))"
        case .syncing:          return "Sincronizando…"
        case .error(let msg):   return "Sin sincronizar · \(msg)"
        case .signedOut:        return "Sin cuenta"
        }
    }

    private func navButton(_ section: AppSection) -> some View {
        let isActive = selection == section
        return Button {
            selection = section
        } label: {
            Image(systemName: section.symbol)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(isActive ? Palette.accent : Palette.textFaint)
                .frame(width: 34, height: 32)
                .background(
                    RoundedRectangle(cornerRadius: 9)
                        .fill(isActive ? Palette.accent.opacity(0.10) : .clear)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(section.label)
    }
}
