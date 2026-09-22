import SwiftUI

/// El marco de la app: la barra lateral y la sección elegida.
struct RootView: View {
    @AppStorage("section") private var sectionRaw = AppSection.habits.rawValue
    @State private var isLoggingIn = false

    private var section: Binding<AppSection> {
        Binding(
            get: { AppSection(rawValue: sectionRaw) ?? .habits },
            set: { sectionRaw = $0.rawValue }
        )
    }

    var body: some View {
        HStack(spacing: 0) {
            Sidebar(selection: section, onLogin: { isLoggingIn = true })

            Group {
                switch section.wrappedValue {
                case .habits:   TodayView()
                case .finances: FinancesView()
                case .tasks:    TasksView()
                default:        NotBuiltYet(section: section.wrappedValue)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(Palette.base)
        .sheet(isPresented: $isLoggingIn) { LoginSheet() }
    }
}

/// Las secciones que todavía viven sólo en la web. Mejor decirlo que dejar un
/// botón que no hace nada.
struct NotBuiltYet: View {
    let section: AppSection

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: section.symbol)
                .font(.system(size: 22, weight: .light))
                .foregroundStyle(Palette.textFaint)
            Text(section.label)
                .font(.system(size: 15, weight: .bold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(Palette.textMuted)
            Text("Todavía no está en la app nativa.\nPor ahora vive en la versión web.")
                .font(.system(size: 12))
                .foregroundStyle(Palette.textFaint)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
