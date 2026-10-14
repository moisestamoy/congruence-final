import Foundation

// MARK: - Grupos: encontrar, sugerir, "#grupo"

extension TaskStore {
    /// Sin mayúsculas ni tildes, para comparar "Anto" con "antoecom".
    static func fold(_ s: String) -> String {
        s.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: nil)
    }

    /// Palabras que dicen algo: tres letras o más y que no sean de relleno.
    /// Tres y no cuatro porque "ads", "web" o "app" dicen mucho.
    static func meaningfulWords(_ text: String) -> Set<String> {
        let relleno: Set<String> = ["para", "como", "esto", "este", "esta", "estos", "hacer",
                                    "todo", "todos", "sobre", "desde", "pero", "porque",
                                    "cuando", "donde", "algo", "cada", "entre", "hasta",
                                    "tener", "ver", "mas", "que", "con", "los", "las",
                                    "del", "una", "uno", "por", "sin", "les", "sus",
                                    "hay", "muy", "ese", "esa", "eso", "the", "and", "for"]
        return Set(fold(text)
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.count >= 3 && !relleno.contains($0) })
    }

    /// El grupo al que apunta un "#algo": el que empieza así (sin espacios).
    func group(matching token: String) -> TaskGroup? {
        let t = Self.fold(token)
        guard t.count >= 2 else { return nil }
        let nombres = document.groups.map { ($0, Self.fold($0.name).replacingOccurrences(of: " ", with: "")) }
        return nombres.first { $0.1 == t }?.0 ?? nombres.first { $0.1.hasPrefix(t) }?.0
    }

    /// Separa los "#grupo" del texto: el primero que coincide con un grupo
    /// lo elige, y todos los que coinciden se quitan del texto. Un "#" que
    /// no es de ningún grupo se queda donde está.
    func resolveHashtags(_ text: String) -> (text: String, groupId: String?) {
        var elegido: String?
        let palabras = text.split(separator: " ", omittingEmptySubsequences: false).filter { palabra in
            guard palabra.hasPrefix("#"), let g = group(matching: String(palabra.dropFirst())) else {
                return true
            }
            if elegido == nil { elegido = g.id }
            return false
        }
        let limpio = palabras.joined(separator: " ")
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespaces)
        return (limpio, elegido)
    }

    /// El grupo que más se parece a lo que escribes: por el nombre del grupo
    /// dentro del texto, y por las palabras que ya usaste en tareas de cada
    /// grupo. Sólo si uno gana claro; ante la duda, nada.
    func suggestGroup(for text: String) -> TaskGroup? {
        let palabras = Self.meaningfulWords(text)
        guard !palabras.isEmpty else { return nil }
        var puntos: [String: Int] = [:]
        for g in document.groups {
            let nombre = Self.fold(g.name).replacingOccurrences(of: " ", with: "")
            if palabras.contains(where: { nombre.hasPrefix($0) || $0.hasPrefix(nombre) }) {
                puntos[g.id, default: 0] += 3
            }
        }
        for t in document.tasks {
            guard let g = t.groupId else { continue }
            let comunes = palabras.intersection(Self.meaningfulWords(t.text)).count
            if comunes > 0 { puntos[g, default: 0] += comunes }
        }
        let orden = puntos.sorted { $0.value > $1.value }
        guard let primero = orden.first, primero.value >= 2,
              orden.count == 1 || orden[1].value < primero.value else { return nil }
        return document.groups.first { $0.id == primero.key }
    }
}
