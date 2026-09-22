import AVFoundation

/// Los tres sonidos de la web (`ToDoPage.tsx`), sintetizados con el mismo
/// perfil que allá hace la Web Audio API: la campana al completar o agregar,
/// el pop al deshacer o borrar, y el golpe de tecla al escribir.
///
/// La web los genera en vivo con osciladores; acá se calculan una sola vez a
/// buffers PCM y se reproducen desde un grupo de nodos, porque escribiendo
/// rápido los golpes de tecla se pisan y un solo nodo los encolaría.
@MainActor
final class SoundEffects {
    static let shared = SoundEffects()

    enum Effect { case bell, pop, key }

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var next = 0
    private var buffers: [Effect: AVAudioPCMBuffer] = [:]
    private var started = false

    private init() {}

    /// Suena `effect`, salvo que el sonido esté apagado. El motor arranca en
    /// el primer sonido: así una app que abrís y no tocás no toma el audio.
    func play(_ effect: Effect, enabled: Bool = true) {
        guard enabled, start() else { return }
        guard let buffer = buffers[effect] else { return }
        let player = players[next]
        next = (next + 1) % players.count
        player.stop()
        player.scheduleBuffer(buffer, at: nil, options: .interrupts)
        player.play()
    }

    private func start() -> Bool {
        if started { return true }

        let format = engine.outputNode.inputFormat(forBus: 0)
        guard format.sampleRate > 0 else { return false }
        let rate = format.sampleRate

        buffers[.bell] = Self.bell(rate: rate, format: format)
        buffers[.pop] = Self.pop(rate: rate, format: format)
        buffers[.key] = Self.key(rate: rate, format: format)

        for _ in 0..<6 {
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)
            players.append(player)
        }

        do {
            try engine.start()
        } catch {
            // Sin audio la app sigue funcionando; no vale un error en pantalla.
            players.forEach(engine.detach)
            players.removeAll()
            buffers.removeAll()
            return false
        }
        started = true
        return true
    }

    // MARK: - Síntesis

    private static func buffer(rate: Double, format: AVAudioFormat,
                               seconds: Double,
                               sample: (Int, Double) -> Float) -> AVAudioPCMBuffer? {
        let frames = AVAudioFrameCount(rate * seconds)
        guard frames > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames)
        else { return nil }
        buffer.frameLength = frames
        guard let channels = buffer.floatChannelData else { return nil }
        for i in 0..<Int(frames) {
            let value = sample(i, Double(i) / rate)
            for c in 0..<Int(format.channelCount) { channels[c][i] = value }
        }
        return buffer
    }

    /// Mi 6 con dos armónicos, cayendo 0,7 s: los mismos 1318/2637/3956 Hz y
    /// las mismas amplitudes 0,15/(i+1) que la web.
    private static func bell(rate: Double, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let partials: [(freq: Double, gain: Double)] = [
            (1318, 0.15), (2637, 0.075), (3956, 0.05),
        ]
        let duration = 0.7
        return buffer(rate: rate, format: format, seconds: duration) { _, t in
            var value = 0.0
            for p in partials {
                // La web hace exponentialRampToValueAtTime(0.001) en 0,7 s.
                let decay = pow(0.001 / p.gain, t / duration)
                value += p.gain * decay * sin(2 * .pi * p.freq * t)
            }
            return Float(value)
        }
    }

    /// Caída de 200 a 65 Hz en 0,1 s. Hay que integrar la fase: usar la
    /// frecuencia instantánea directamente daría un barrido distinto.
    private static func pop(rate: Double, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let (f0, f1, duration, g0) = (200.0, 65.0, 0.1, 0.25)
        let k = log(f1 / f0) / duration
        return buffer(rate: rate, format: format, seconds: duration) { _, t in
            let phase = 2 * .pi * f0 * (exp(k * t) - 1) / k
            let decay = pow(0.001 / g0, t / duration)
            return Float(g0 * decay * sin(phase))
        }
    }

    /// 512 muestras de ruido por un pasabanda en 950 Hz, Q 1,5 — el mismo
    /// golpe seco de tecla de la web.
    private static func key(rate: Double, format: AVAudioFormat) -> AVAudioPCMBuffer? {
        let frames = 512
        var noise = (0..<frames).map { _ in Double.random(in: -1...1) * 0.08 }

        // Pasabanda bicuadrático (RBJ), como el BiquadFilterNode de la web.
        let w0 = 2 * Double.pi * 950 / rate
        let alpha = sin(w0) / (2 * 1.5)
        let a0 = 1 + alpha
        let (b0, b1, b2) = (alpha / a0, 0.0, -alpha / a0)
        let (a1, a2) = (-2 * cos(w0) / a0, (1 - alpha) / a0)
        var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0
        for i in 0..<frames {
            let x = noise[i]
            let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            noise[i] = y
        }

        return buffer(rate: rate, format: format, seconds: Double(frames) / rate) { i, _ in
            i < frames ? Float(noise[i]) : 0
        }
    }
}
