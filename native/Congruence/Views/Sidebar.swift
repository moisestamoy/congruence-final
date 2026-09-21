import SwiftUI

enum Section: String, CaseIterable, Identifiable {
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
        .shadow(color: color.opacity(0.6), radius: size * 0.3)
    }
}

struct Sidebar: View {
    @Binding var selection: Section

    var body: some View {
        VStack(spacing: 0) {
            RingMark(size: 26)
                .padding(.top, 22)
                .padding(.bottom, 26)

            VStack(spacing: 6) {
                ForEach(Section.allCases) { section in
                    navButton(section)
                }
            }

            Spacer()

            Text("Orden")
                .microLabelStyle(Palette.textFaint, size: 8)
                .padding(.vertical, 5)
                .padding(.horizontal, 8)
                .background(Color.white.opacity(0.03), in: RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6).stroke(Palette.hairlineFaint, lineWidth: 1)
                )
                .padding(.bottom, 10)

            Image(systemName: "arrow.right.square")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Palette.positive)
                .frame(width: 30, height: 30)
                .background(Palette.positive.opacity(0.08), in: RoundedRectangle(cornerRadius: 9))
                .padding(.bottom, 18)
        }
        .frame(width: 72)
        .frame(maxHeight: .infinity)
        .background(Palette.surface)
        .overlay(alignment: .trailing) {
            Rectangle()
                .fill(Palette.hairlineFaint)
                .frame(width: 1)
        }
    }

    private func navButton(_ section: Section) -> some View {
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
