import Foundation
import Observation

@Observable
final class IdentityStore {
    var manifesto: IdentityManifesto

    private let fileURL: URL

    init(fileURL: URL? = nil) {
        self.fileURL = fileURL ?? IdentityStore.defaultFileURL()
        if let data = try? Data(contentsOf: self.fileURL),
           let decoded = try? JSONDecoder().decode(IdentityManifesto.self, from: data) {
            manifesto = decoded
        } else {
            manifesto = .empty
        }
    }

    private static func defaultFileURL() -> URL {
        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Congruence", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("identity.json")
    }

    func save() {
        guard let data = try? JSONEncoder().encode(manifesto) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
