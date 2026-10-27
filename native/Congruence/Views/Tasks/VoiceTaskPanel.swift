import SwiftUI

/// Dictar tareas, dentro del mismo campo de escribir. Tres momentos:
/// escuchar (se ve lo que vas diciendo), entender (un segundo), y revisar las
/// tareas que salieron — cada una con su tipo, grupo y fecha, todo
/// corregible — antes de guardarlas.
@available(macOS 26.0, iOS 26.0, *)
struct VoiceTaskPanel: View {
    let column: TaskColumn
    var compact = false
    let onClose: () -> Void

    @Environment(TaskStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var recorder = VoiceRecorder()
    @State private var phase: Phase = .listening
    @State private var drafts: [VoiceDraft] = []
    @State private var heard = ""

    enum Phase { case listening, thinking, review }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            switch phase {
            case .listening: listening
            case .thinking:  thinking
            case .review:    review
            }
        }
        .padding(compact ? 11 : 14)
        .task {
            VoiceTaskParser.prewarm()
            await recorder.start()
        }
        .onDisappear { if phase == .listening { recorder.cancel() } }
        .onEscape { close() }
        .animation(.smooth(duration: 0.2), value: phase)
    }

    // MARK: Escuchar

    private var listening: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 12) {
                micBubble
                VStack(alignment: .leading, spacing: 4) {
                    Text(statusLine)
                        .font(.system(size: 10, weight: .bold))
                        .tracking(1)
                        .textCase(.uppercase)
                        .foregroundStyle(isError ? Palette.negative : Palette.accent)
                    if case .error(let msg) = recorder.state {
                        Text(msg)
                            .font(.system(size: 12))
                            .foregroundStyle(Palette.textMuted)
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text(recorder.transcript.isEmpty ? hint : recorder.transcript)
                            .font(.system(size: compact ? 13 : 14))
                            .foregroundStyle(recorder.transcript.isEmpty ? Palette.textFaint : Palette.text)
                            .fixedSize(horizontal: false, vertical: true)
                            .animation(.smooth(duration: 0.15), value: recorder.transcript)
                    }
                }
                Spacer(minLength: 0)
            }
            HStack(spacing: 10) {
                Spacer()
                Button("Cancelar") { close() }
                    .buttonStyle(.pressable)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                if !isError {
                    Button(action: finish) {
                        HStack(spacing: 5) {
                            Text("Listo")
                            Text("↩").foregroundStyle(Palette.onAccent.opacity(0.7))
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Palette.onAccent)
                        .padding(.horizontal, 14)
                        .frame(height: 28)
                        .background(Capsule().fill(Palette.accent))
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.pressable)
                    .keyboardShortcut(.return, modifiers: [])
                    .disabled(recorder.state != .listening)
                    .opacity(recorder.state == .listening ? 1 : 0.4)
                }
            }
        }
    }

    private var hint: String {
        "Di tus tareas de corrido. Ej: \"mañana armar el reporte de Anto, es prioritario, y leer el capítulo, eso es no brain\""
    }

    private var statusLine: String {
        switch recorder.state {
        case .idle: return "Preparando…"
        case .preparing(let msg): return msg
        case .listening: return "Te escucho"
        case .error: return "No se pudo"
        }
    }

    private var isError: Bool {
        if case .error = recorder.state { return true } else { return false }
    }

    /// El micrófono late con tu voz: si no se mueve, no te está oyendo.
    private var micBubble: some View {
        ZStack {
            Circle()
                .fill(Palette.accent.opacity(0.15))
                .frame(width: 34, height: 34)
                .scaleEffect(reduceMotion ? 1 : 1 + recorder.level * 0.6)
                .animation(.easeOut(duration: 0.12), value: recorder.level)
            Circle()
                .fill(isError ? Palette.negative : Palette.accent)
                .frame(width: 26, height: 26)
            Image(systemName: isError ? "mic.slash.fill" : "mic.fill")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Palette.onAccent)
        }
        .frame(width: 40, height: 40)
    }

    // MARK: Entender

    private var thinking: some View {
        HStack(alignment: .top, spacing: 12) {
            ProgressView().controlSize(.small).frame(width: 40, height: 28)
            VStack(alignment: .leading, spacing: 4) {
                Text("Entendiendo…")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.accent)
                Text(heard)
                    .font(.system(size: 13))
                    .foregroundStyle(Palette.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
    }

    // MARK: Revisar

    private var review: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(drafts.count == 1 ? "1 tarea" : "\(drafts.count) tareas")
                    .font(.system(size: 10, weight: .bold))
                    .tracking(1)
                    .textCase(.uppercase)
                    .foregroundStyle(Palette.accent)
                Spacer()
                Text("“\(heard)”")
                    .font(.system(size: 10))
                    .italic()
                    .foregroundStyle(Palette.textFaint)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }

            if drafts.isEmpty {
                Text("No se escuchó nada. Prueba otra vez, un poco más cerca.")
                    .font(.system(size: 12))
                    .foregroundStyle(Palette.textMuted)
            }

            ForEach($drafts) { $draft in
                VoiceDraftRow(draft: $draft, compact: compact) {
                    withAnimation(.smooth(duration: 0.2)) { drafts.removeAll { $0.id == draft.id } }
                }
            }

            HStack(spacing: 10) {
                Button {
                    drafts = []
                    phase = .listening
                    Task { await recorder.start() }
                } label: {
                    Label("Dictar otra vez", systemImage: "mic")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.textMuted)
                }
                .buttonStyle(.pressable)
                Spacer()
                Button("Cancelar") { close() }
                    .buttonStyle(.pressable)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Palette.textMuted)
                Button(action: save) {
                    HStack(spacing: 5) {
                        Text(drafts.count > 1 ? "Guardar \(drafts.count)" : "Guardar")
                        Text("↩").foregroundStyle(Palette.onAccent.opacity(0.7))
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.onAccent)
                    .padding(.horizontal, 14)
                    .frame(height: 28)
                    .background(Capsule().fill(drafts.isEmpty ? Palette.fill(0.1) : Palette.accent))
                    .contentShape(Capsule())
                }
                .buttonStyle(.pressable)
                .keyboardShortcut(.return, modifiers: [])
                .disabled(drafts.isEmpty)
            }
        }
    }

    // MARK: Acciones

    private func finish() {
        Task {
            let texto = await recorder.stop()
            heard = texto
            guard !texto.isEmpty else {
                drafts = []
                phase = .review
                return
            }
            phase = .thinking
            drafts = await VoiceTaskParser.parse(texto, store: store)
            phase = .review
        }
    }

    private func save() {
        let validos = drafts.filter { !$0.text.trimmingCharacters(in: .whitespaces).isEmpty }
        guard !validos.isEmpty else { return }
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        withAnimation(.smooth(duration: 0.3)) {
            for d in validos {
                store.addTask(text: d.text, priority: .normal, deadline: d.deadline,
                              groupId: d.groupId, column: column, tier: d.tier)
            }
        }
        onClose()
    }

    private func close() {
        recorder.cancel()
        onClose()
    }
}

/// Una tarea dictada, lista para corregir: el texto, el tipo, el grupo y la
/// fecha. Si no dijiste el tipo, se marca para que lo elijas.
@available(macOS 26.0, iOS 26.0, *)
private struct VoiceDraftRow: View {
    @Binding var draft: VoiceDraft
    var compact: Bool
    let onRemove: () -> Void

    @Environment(TaskStore.self) private var store

    private var deadline: Binding<Date?> {
        Binding(get: { draft.deadline.map(FinDate.date) },
                set: { draft.deadline = $0.map(HabitDay.key) })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Circle()
                    .fill(draft.tier.map { Color.tint($0.hex) } ?? Palette.warning)
                    .frame(width: 6, height: 6)
                TextField("", text: $draft.text)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Palette.text)
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(Palette.textFaint)
                        .frame(width: 18, height: 18)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.pressable)
                .help("Quitar esta")
            }
            FlowLayout(spacing: 4) {
                TierOptions(tier: draft.tier, compact: compact) { t in
                    draft.tier = draft.tier == t ? nil : t
                }
                if draft.tier == nil {
                    Text("Falta el tipo")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Palette.warning)
                        .frame(height: 24)
                }
                GroupPicker(groupId: $draft.groupId, groups: store.document.groups)
                DeadlineField(date: deadline)
            }
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: Radius.inner).fill(Palette.fill(0.05)))
        .overlay(RoundedRectangle(cornerRadius: Radius.inner)
            .stroke(draft.tier == nil ? Palette.warning.opacity(0.35) : Palette.hairlineFaint,
                    lineWidth: 1))
    }
}

/// Que el próximo campo de escribir que se abra empiece dictando (⇧⌘D desde
/// cualquier lado de Tareas).
private struct DictateOnOpenKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var dictateOnOpen: Bool {
        get { self[DictateOnOpenKey.self] }
        set { self[DictateOnOpenKey.self] = newValue }
    }
}
