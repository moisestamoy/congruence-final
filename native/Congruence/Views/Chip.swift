import SwiftUI

/// Píldora seleccionable. Reemplaza a los `Picker` y `Toggle` del sistema, que
/// traen el azul de macOS y rompen el tema oscuro de la app.
struct Chip: View {
    let label: String
    let isSelected: Bool
    var tint: Color = Palette.accent
    var fillsWidth = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(isSelected ? tint : Palette.textMuted)
                .lineLimit(1)
                .padding(.horizontal, 12)
                .frame(maxWidth: fillsWidth ? .infinity : nil)
                .frame(height: 30)
                .background(
                    Capsule().fill(isSelected ? tint.opacity(0.12) : Color.white.opacity(0.03))
                )
                .overlay(
                    Capsule().stroke(
                        isSelected ? tint.opacity(0.45) : Palette.hairlineFaint,
                        lineWidth: 1
                    )
                )
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .animation(.smooth(duration: 0.2), value: isSelected)
    }
}

/// Campo de texto con el aspecto de la app, sin el recuadro del sistema.
struct DarkField: View {
    let placeholder: String
    @Binding var text: String
    var width: CGFloat?

    var body: some View {
        // El placeholder va bien apagado: si se parece a texto escrito, parece
        // que el campo ya está completo y no se entiende por qué no se puede
        // guardar. Lo dibujamos a mano porque en macOS el color del `prompt`
        // se ignora y queda el gris claro del sistema.
        ZStack(alignment: .leading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.textFaint.opacity(0.7))
                    .allowsHitTesting(false)
            }
            TextField("", text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Palette.text)
        }
            .padding(.horizontal, 12)
            .frame(width: width, height: 38)
            .frame(maxWidth: width == nil ? .infinity : nil)
            .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: 9))
            .overlay(
                RoundedRectangle(cornerRadius: 9).stroke(Palette.hairlineFaint, lineWidth: 1)
            )
    }
}
