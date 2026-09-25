import SwiftUI

struct HabitRow: View {
    let habit: Habit
    let day: String
    /// Los últimos 7 días, del más viejo al más reciente.
    let weekDots: [Bool]
    /// Veces cumplidas esta semana. Sólo importa si el hábito tiene mínimo.
    let weekCount: Int
    let onToggle: () -> Void
    let onSetValue: (Double) -> Void
    let onSkip: (LogStatus) -> Void
    var onEdit: () -> Void = {}
    var onMove: (Int) -> Void = { _ in }
    var onDelete: () -> Void = {}

    /// La onda que sale del círculo al marcarlo.
    @State private var burst = false

    private var log: HabitLog? { habit.log(on: day) }
    private var isDone: Bool { log?.completed == true }
    private var isPaused: Bool { log?.isPaused == true }
    private var tint: Color { .tint(habit.color) }

    /// El mínimo de la semana ya está cubierto: el hábito queda tachado y
    /// deja de pedirse hasta el lunes.
    private var weeklyMet: Bool {
        guard let target = habit.weeklyTarget else { return false }
        return weekCount >= target
    }

    var body: some View {
        HStack(spacing: 0) {
            marker
                .padding(.trailing, 14)

            if let icon = habit.icon, !icon.isEmpty {
                Text(icon)
                    .font(.system(size: 14))
                    .padding(.trailing, 10)
            }

            Text(habit.title)
                .textCase(.uppercase)
                .font(.system(size: 12, weight: .bold))
                .tracking(1.1)
                .foregroundStyle(weeklyMet && !isDone ? Palette.textFaint : statusColor)
                .lineLimit(1)
                // El tachado corre después de que los segmentos de la semana
                // se unen: primero se cumple, después se cierra.
                .animatedStrike(isPaused || weeklyMet, color: Palette.textFaint,
                                delay: weeklyMet ? 0.35 : 0)

            Spacer(minLength: 10)

            // Los hábitos numéricos muestran el contador; el resto, la semana.
            if habit.type == .numeric {
                numericControl
            } else if habit.weeklyTarget != nil {
                weeklyCount
            } else {
                weekStrip
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 56)
        .background(rowSurface)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isDone ? tint.opacity(0.45) : Palette.hairlineFaint, lineWidth: 1)
        )
        // El resplandor sólo aparece al completar. Es la única recompensa
        // visual de la fila: si brillara siempre, no significaría nada.
        .shadow(color: isDone ? Palette.nightGlow(tint, 0.20) : .clear, radius: 14, y: 3)
        .opacity(isPaused ? 0.5 : 1)
        .animation(.smooth(duration: 0.3), value: isDone)
        .animation(.easeInOut(duration: 0.8), value: isPaused)
        // Un toque suave al marcar: en el iPhone vibra, en la Mac el trackpad.
        .sensoryFeedback(.impact(weight: .light), trigger: isDone)
        .onChange(of: isDone) { _, hecho in
            guard hecho else { return }
            burst = false
            // En la vuelta siguiente, para que la onda arranque de cero.
            DispatchQueue.main.async {
                withAnimation(.easeOut(duration: 0.55)) { burst = true }
            }
        }
        // Toda la fila marca el hábito, no sólo el círculo. Los botones de
        // adentro (el propio círculo, el +/-) se comen el toque antes.
        .contentShape(RoundedRectangle(cornerRadius: 12))
        .onTapGesture { if !isPaused { onToggle() } }
        .contextMenu {
            Button("Editar…", action: onEdit)
            Divider()
            Button("Marcar descanso") { onSkip(.rest) }
            Button("Marcar imprevisto") { onSkip(.emergency) }
            Divider()
            Button("Subir") { onMove(-1) }
            Button("Bajar") { onMove(1) }
            Divider()
            Button("Borrar…", role: .destructive, action: onDelete)
        }
        .help(isPaused ? pauseLabel : (habit.subtitle ?? habit.title))
    }

    /// Completado = lavado tintado del color del hábito, más fuerte arriba.
    /// No es vidrio: sobre negro plano el vidrio no refracta nada. Es el color
    /// del propio hábito tiñendo su fila.
    private var rowSurface: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(Palette.nested)
            .overlay {
                if isDone {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [tint.opacity(0.16), tint.opacity(0.03)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                }
            }
    }

    private var statusColor: Color {
        if isPaused { return Palette.textFaint }
        return isDone ? tint : Palette.textMuted
    }

    private var pauseLabel: String {
        if let reason = log?.pauseReason, !reason.isEmpty { return reason }
        return log?.status == .rest ? "Descanso" : "Imprevisto"
    }

    /// Sólo indicador. El que marca es el gesto de la fila entera — tener acá
    /// un botón además del gesto era dos controles para la misma acción, y dos
    /// formas de dispararla sin querer.
    private var marker: some View {
        ZStack {
            Circle()
                .stroke(isDone ? tint : Palette.hairline, lineWidth: 1.5)
                .frame(width: 20, height: 20)

            // La onda: un anillo del color del hábito que se abre y se apaga.
            Circle()
                .stroke(tint, lineWidth: 1.5)
                .frame(width: 20, height: 20)
                .scaleEffect(burst ? 2.1 : 1)
                .opacity(burst ? 0 : (isDone ? 0.7 : 0))
                .allowsHitTesting(false)

            if isDone {
                Circle()
                    .fill(tint)
                    .frame(width: 10, height: 10)
                    .shadow(color: Palette.nightGlow(tint, 0.6), radius: 6)
                    .transition(.scale(scale: 0.1).combined(with: .opacity)
                        .animation(.spring(response: 0.35, dampingFraction: 0.55)))
            } else if isPaused {
                Rectangle()
                    .fill(Palette.textFaint)
                    .frame(width: 9, height: 1.5)
            }
        }
    }

    private var weekStrip: some View {
        HStack(spacing: 5) {
            ForEach(Array(weekDots.enumerated()), id: \.offset) { _, done in
                Circle()
                    .fill(done ? tint.opacity(0.85) : Palette.fill(0.10))
                    .frame(width: 4, height: 4)
            }
        }
    }

    /// Para un hábito semanal, los siete puntos no dicen lo que importa. Lo
    /// que importa es cuánto falta para el mínimo.
    private var weeklyCount: some View {
        let target = habit.weeklyTarget ?? 0
        return HStack(spacing: 6) {
            // Al cumplir el mínimo, los segmentos se juntan en una sola línea.
            HStack(spacing: weeklyMet ? 0 : 3) {
                ForEach(0..<max(target, 1), id: \.self) { i in
                    Capsule()
                        .fill(i < weekCount ? tint.opacity(0.85) : Palette.fill(0.10))
                        .frame(width: weeklyMet ? 11 : 8, height: 3)
                }
            }
            .clipShape(Capsule())
            .animation(.spring(response: 0.45, dampingFraction: 0.75), value: weeklyMet)
            .animation(.smooth(duration: 0.3), value: weekCount)
            Text("\(min(weekCount, target))/\(target)")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(weeklyMet ? tint : Palette.textFaint)
        }
        .help(weeklyMet ? "Mínimo de la semana cumplido"
                        : "\(weekCount) de \(target) esta semana")
    }

    private var numericControl: some View {
        HStack(spacing: 10) {
            stepButton("minus") {
                onSetValue(max(0, (log?.value ?? 0) - stepSize))
            }

            HStack(spacing: 3) {
                Text("\(Int(log?.value ?? 0))")
                    .font(.system(size: 14, weight: .bold))
                    .monospacedDigit()
                    .foregroundStyle(isDone ? tint : Palette.text)
                Text("/ \(Int(habit.goal))\(habit.unit.map { " \($0)" } ?? "")")
                    .font(.system(size: 10))
                    .monospacedDigit()
                    .foregroundStyle(Palette.textFaint)
            }
            .frame(minWidth: 70, alignment: .trailing)

            stepButton("plus") {
                onSetValue((log?.value ?? 0) + stepSize)
            }
        }
        .disabled(isPaused)
    }

    /// Pasos redondos según la meta: de a 5 para metas grandes, de a 1 si es chica.
    private var stepSize: Double {
        habit.goal >= 30 ? 5 : 1
    }

    private func stepButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Palette.textMuted)
                .frame(width: 22, height: 22)
                .background(Palette.fill(0.04), in: RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
}
