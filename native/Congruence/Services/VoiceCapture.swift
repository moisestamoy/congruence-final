import AVFoundation
import Foundation
import FoundationModels
import Observation
import Speech

/// Dictar tareas: hablas, se transcribe en vivo en el propio dispositivo
/// (SpeechAnalyzer), y el modelo de Apple Intelligence que corre en tu Mac
/// separa lo que dijiste en tareas. Nada sale del dispositivo.
///
/// Sólo existe desde macOS 26 / iOS 26. En sistemas anteriores el botón del
/// micrófono no aparece y lo demás sigue igual.
enum VoiceSupport {
    static var isAvailable: Bool {
        if #available(macOS 26.0, iOS 26.0, *) { return SpeechTranscriber.isAvailable }
        return false
    }
}

/// Una tarea que salió de lo dictado, antes de guardarla. Se puede corregir
/// todo antes de guardar.
struct VoiceDraft: Identifiable, Equatable {
    let id = UUID()
    var text: String
    var tier: TaskTier?
    var groupId: String?
    var deadline: String?
}

// MARK: - Grabar y transcribir

@available(macOS 26.0, iOS 26.0, *)
@MainActor
@Observable
final class VoiceRecorder {
    enum State: Equatable {
        case idle
        /// Pidiendo permiso o bajando el idioma la primera vez.
        case preparing(String)
        case listening
        case error(String)
    }

    private(set) var state: State = .idle
    /// Lo dicho hasta ahora: lo ya firme más lo que todavía puede cambiar.
    private(set) var transcript = ""
    /// Qué tan fuerte llega la voz (0…1), para que se vea que escucha.
    private(set) var level: Double = 0

    @ObservationIgnored private var finalized = ""
    @ObservationIgnored private var volatile = ""
    @ObservationIgnored private let engine = AVAudioEngine()
    @ObservationIgnored private var analyzer: SpeechAnalyzer?
    @ObservationIgnored private var input: AsyncStream<AnalyzerInput>.Continuation?
    @ObservationIgnored private var resultsTask: Task<Void, Never>?

    func start() async {
        guard state == .idle || isError else { return }
        finalized = ""; volatile = ""; transcript = ""
        do {
            state = .preparing("Pidiendo permiso…")
            guard await Self.microphoneAllowed() else {
                state = .error("Congruence no tiene permiso para el micrófono. Actívalo en Ajustes del Sistema → Privacidad → Micrófono.")
                return
            }
            _ = await Self.speechAllowed()

            let locale = await SpeechTranscriber.supportedLocale(equivalentTo: Locale.current)
                ?? Locale(identifier: "es_US")
            let transcriber = SpeechTranscriber(locale: locale, preset: .progressiveTranscription)

            // La primera vez hay que bajar el idioma (una sola vez, unos MB).
            if let pedido = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
                state = .preparing("Descargando el español (sólo la primera vez)…")
                try await pedido.downloadAndInstall()
            }

            let analyzer = SpeechAnalyzer(modules: [transcriber])
            self.analyzer = analyzer

            #if os(iOS)
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)
            #endif

            let entrada = engine.inputNode
            let natural = entrada.outputFormat(forBus: 0)
            guard let formato = await SpeechAnalyzer.bestAvailableAudioFormat(
                compatibleWith: [transcriber], considering: natural) else {
                state = .error("No se pudo preparar el audio.")
                return
            }
            try await analyzer.prepareToAnalyze(in: formato)

            let (stream, continuation) = AsyncStream<AnalyzerInput>.makeStream()
            self.input = continuation

            resultsTask = Task { [weak self] in
                do {
                    for try await r in transcriber.results {
                        let texto = String(r.text.characters)
                        await MainActor.run {
                            guard let self else { return }
                            if r.isFinal {
                                self.finalized += texto
                                self.volatile = ""
                            } else {
                                self.volatile = texto
                            }
                            self.transcript = (self.finalized + self.volatile)
                                .trimmingCharacters(in: .whitespaces)
                        }
                    }
                } catch {}
            }

            let convertidor = AVAudioConverter(from: natural, to: formato)
            entrada.installTap(onBus: 0, bufferSize: 2048, format: natural) { [weak self] buffer, _ in
                let nivel = Self.rms(buffer)
                if let listo = Self.convert(buffer, with: convertidor, to: formato) {
                    continuation.yield(AnalyzerInput(buffer: listo))
                }
                Task { @MainActor in self?.level = nivel }
            }
            engine.prepare()
            try engine.start()
            try await analyzer.start(inputSequence: stream)
            state = .listening
        } catch {
            cleanUp()
            state = .error("No se pudo empezar a escuchar: \(error.localizedDescription)")
        }
    }

    /// Deja de escuchar y devuelve todo lo que se entendió.
    func stop() async -> String {
        guard state == .listening else { cleanUp(); return transcript }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        input?.finish()
        try? await analyzer?.finalizeAndFinishThroughEndOfInput()
        await resultsTask?.value
        let texto = (finalized + volatile).trimmingCharacters(in: .whitespacesAndNewlines)
        cleanUp()
        transcript = texto
        return texto
    }

    func cancel() {
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        input?.finish()
        resultsTask?.cancel()
        if let analyzer { Task { await analyzer.cancelAndFinishNow() } }
        cleanUp()
    }

    private var isError: Bool { if case .error = state { return true } else { return false } }

    private func cleanUp() {
        input = nil
        analyzer = nil
        resultsTask = nil
        level = 0
        state = .idle
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }

    // MARK: Permisos y audio

    private static func microphoneAllowed() async -> Bool {
        #if os(macOS)
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .audio)
        default: return false
        }
        #else
        return await AVAudioApplication.requestRecordPermission()
        #endif
    }

    private static func speechAllowed() async -> Bool {
        if SFSpeechRecognizer.authorizationStatus() == .authorized { return true }
        return await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
    }

    nonisolated private static func convert(_ buffer: AVAudioPCMBuffer, with converter: AVAudioConverter?,
                                            to format: AVAudioFormat) -> AVAudioPCMBuffer? {
        if buffer.format == format { return buffer }
        guard let converter else { return nil }
        let ratio = format.sampleRate / buffer.format.sampleRate
        let capacidad = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32
        guard let salida = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacidad) else { return nil }
        var entregado = false
        var error: NSError?
        converter.convert(to: salida, error: &error) { _, estado in
            if entregado { estado.pointee = .noDataNow; return nil }
            entregado = true
            estado.pointee = .haveData
            return buffer
        }
        return error == nil ? salida : nil
    }

    nonisolated private static func rms(_ buffer: AVAudioPCMBuffer) -> Double {
        guard let data = buffer.floatChannelData?[0], buffer.frameLength > 0 else { return 0 }
        var suma: Float = 0
        for i in 0..<Int(buffer.frameLength) { suma += data[i] * data[i] }
        let rms = sqrt(suma / Float(buffer.frameLength))
        // Voz normal anda por 0.01–0.1: se estira para que se vea.
        return min(1, Double(rms) * 12)
    }
}

// MARK: - Entender lo dicho

@available(macOS 26.0, iOS 26.0, *)
@Generable(description: "Una tarea que la persona dijo")
struct SpokenTask {
    @Guide(description: "La tarea completa con su detalle, empezando con verbo y mayúscula, sin la fecha ni las palabras sobre su importancia. Ej: 'Llamar a Juano por el dashboard'")
    var text: String
    @Guide(description: "Las palabras exactas que dijo sobre la importancia de ESTA tarea (ej: 'es prioritario', 'urgente', 'no brain', 'rápida', 'puede esperar'), o vacío si no dijo nada sobre su importancia")
    var importancia: String
    @Guide(description: "Las palabras exactas que dijo sobre cuándo hacer ESTA tarea (ej: 'mañana', 'el viernes', 'hoy', 'el 3 de noviembre'), o vacío si no dijo ningún día para esta tarea")
    var cuando: String
    @Guide(description: "Las palabras exactas con que nombró un proyecto, cliente, persona o área de ESTA tarea (ej: 'anto', 'lo de imperio', 'casa'), o vacío")
    var deQue: String
}

@available(macOS 26.0, iOS 26.0, *)
@Generable
struct SpokenTasks {
    @Guide(description: "Una entrada por cada tarea distinta que mencionó, en el orden en que las dijo")
    var tareas: [SpokenTask]
}

@available(macOS 26.0, iOS 26.0, *)
enum VoiceTaskParser {
    /// Separa lo dictado en tareas. Si Apple Intelligence no está disponible
    /// (apagado, o el modelo no bajó), lo dicho queda como una sola tarea:
    /// nunca se pierde lo que dijiste.
    @MainActor
    static func parse(_ dicho: String, store: TaskStore) async -> [VoiceDraft] {
        let texto = dicho.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !texto.isEmpty else { return [] }
        guard SystemLanguageModel.default.isAvailable else { return [fallback(texto, store: store)] }

        let grupos = store.document.groups.map(\.name).joined(separator: ", ")
        let sesion = LanguageModelSession(instructions: """
        Separas lo que alguien dictó en tareas para su lista. Copia lo que dijo; no agregues \
        nada que no haya dicho. Ignora muletillas (eh, bueno, o sea, tengo que, recordarme, \
        anota). Si no dijo un día para una tarea, 'cuando' va vacío. Si no dijo nada sobre la \
        importancia de una tarea, 'importancia' va vacío. Sus grupos son: \(grupos).
        """)
        do {
            let r = try await sesion.respond(to: texto, generating: SpokenTasks.self)
            let drafts = r.content.tareas.compactMap { t -> VoiceDraft? in
                let limpio = t.text.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !limpio.isEmpty else { return nil }
                return VoiceDraft(
                    text: limpio,
                    tier: VoiceWords.tier(from: t.importancia),
                    groupId: VoiceWords.group(said: t.deQue, taskText: limpio, heard: texto, store: store),
                    deadline: VoiceWords.date(from: t.cuando))
            }
            return drafts.isEmpty ? [fallback(texto, store: store)] : drafts
        } catch {
            return [fallback(texto, store: store)]
        }
    }

    @MainActor
    private static func fallback(_ texto: String, store: TaskStore) -> VoiceDraft {
        let primera = texto.prefix(1).uppercased() + texto.dropFirst()
        return VoiceDraft(text: primera, tier: VoiceWords.tier(from: texto),
                          groupId: store.suggestGroup(for: texto)?.id,
                          deadline: VoiceWords.date(from: texto))
    }

    /// Carga el modelo antes de que haga falta: la primera respuesta llega
    /// antes si ya estaba en memoria.
    static func prewarm() {
        guard SystemLanguageModel.default.isAvailable else { return }
        LanguageModelSession().prewarm()
    }
}
