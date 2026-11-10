import Foundation
import Observation

/// Los pilares: se guardan en `pillars.json` y viajan dentro de
/// `stats_data.pillars`, igual que en la web.
@Observable
final class PillarStore {
    private(set) var document: PillarsDocument

    /// Después de cada cambio hecho acá (no de los que llegan de la nube).
    @ObservationIgnored var onLocalChange: (() -> Void)?

    private let fileURL: URL

    var lastLocalWrite: Date? {
        (try? FileManager.default.attributesOfItem(atPath: fileURL.path))?[.modificationDate] as? Date
    }

    func backupFile(to carpeta: URL) {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        try? FileManager.default.copyItem(
            at: fileURL, to: carpeta.appendingPathComponent(fileURL.lastPathComponent))
    }

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? PillarStore.defaultFileURL()
        if let data = try? Data(contentsOf: self.fileURL),
           let doc = try? JSONDecoder().decode(PillarsDocument.self, from: data) {
            document = doc
        } else {
            document = .empty
        }
    }

    private static func defaultFileURL() -> URL {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("pillars.json")
    }

    private func writeToDisk() {
        guard let data = try? JSONEncoder().encode(document) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private func commit() {
        writeToDisk()
        onLocalChange?()
    }

    /// Versión que llega de la nube: reemplaza, se guarda y NO avisa.
    func adoptRemote(_ remote: PillarsDocument) {
        guard remote != document else { return }
        document = remote
        writeToDisk()
    }

    // MARK: - Lectura

    func pillar(_ id: PillarId) -> Pillar { document[id] }

    /// Los que se marcan cada día. Si ninguno está en foco, todos.
    var inFocus: [PillarId] {
        let foco = PillarId.allCases.filter { document[$0].enFoco }
        return foco.isEmpty ? PillarId.allCases : foco
    }

    var average: Double {
        Double(PillarId.allCases.reduce(0) { $0 + document[$1].scoreA }) / Double(PillarId.allCases.count)
    }

    /// El pilar más lejos de su meta y por cuántos puntos.
    var furthest: (id: PillarId, gap: Int) {
        let peor = PillarId.allCases.max { a, b in
            document[a].scoreB - document[a].scoreA < document[b].scoreB - document[b].scoreA
        } ?? .mental
        return (peor, document[peor].scoreB - document[peor].scoreA)
    }

    func markedDone(_ id: PillarId, on day: String) -> Bool {
        document.close(on: day)?.done[id.rawValue] == true
    }

    // MARK: - Cambios

    func update(_ id: PillarId, _ change: (inout Pillar) -> Void) {
        var p = document[id]
        change(&p)
        p.scoreA = min(10, max(1, p.scoreA))
        p.scoreB = min(10, max(1, p.scoreB))
        guard p != document[id] else { return }
        document[id] = p
        commit()
    }

    func setDone(_ id: PillarId, on day: String, _ done: Bool) {
        guard markedDone(id, on: day) != done else { return }
        withClose(day) { $0.done[id.rawValue] = done }
    }

    func setAnswer(_ key: WritableKeyPath<DailyClose, String>, on day: String, _ text: String) {
        // Borrar un campo vacío de un día sin cierre no crea un cierre vacío.
        guard (document.close(on: day)?[keyPath: key] ?? "") != text else { return }
        withClose(day) { $0[keyPath: key] = text }
    }

    /// Guarda la revisión; sus puntajes pasan a ser el nuevo punto de partida.
    func addReview(scores: [PillarId: Int], reflexion: String, mejora1pct: String, pospuse: String, on day: String) {
        var porId: [String: Int] = [:]
        for id in PillarId.allCases {
            let s = min(10, max(1, scores[id] ?? document[id].scoreA))
            porId[id.rawValue] = s
            document[id].scoreA = s
        }
        document.reviews.append(WeeklyReview(
            id: UUID().uuidString, date: day, scores: porId,
            reflexion: reflexion, mejora1pct: mejora1pct, pospuse: pospuse))
        commit()
    }

    private func withClose(_ day: String, _ change: (inout DailyClose) -> Void) {
        if let i = document.closes.firstIndex(where: { $0.date == day }) {
            change(&document.closes[i])
        } else {
            var nuevo = DailyClose(date: day)
            change(&nuevo)
            document.closes.append(nuevo)
        }
        commit()
    }
}

extension PillarStore {
    /// El hábito sí/no que sirve a un pilar, si hay uno: su check es el del pilar.
    func linkedHabit(_ id: PillarId, in habits: HabitStore) -> Habit? {
        habits.habits.first { $0.pillar == id && $0.type == .boolean && !$0.isArchived }
    }

    func isDone(_ id: PillarId, on day: String, habits: HabitStore) -> Bool {
        markedDone(id, on: day) || linkedHabit(id, in: habits)?.log(on: day)?.completed == true
    }

    /// Marca o desmarca el pilar y, si tiene hábito, también el hábito: así
    /// suma al anillo.
    func toggle(_ id: PillarId, on day: String, habits: HabitStore) {
        let next = !isDone(id, on: day, habits: habits)
        setDone(id, on: day, next)
        if let h = linkedHabit(id, in: habits), (h.log(on: day)?.completed == true) != next {
            habits.toggle(h.id, on: day)
        }
    }
}
