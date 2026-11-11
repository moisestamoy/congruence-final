import Foundation

/// Fusión a tres bandas de dos copias de un mismo documento JSON.
///
/// `base` es lo último que esta app y la nube tuvieron igual; `local` es lo
/// que hay acá; `remote`, lo que hay ahora en la nube. Cada parte se decide
/// por separado: lo que sólo cambió un lado se toma de ese lado, y si
/// cambiaron los dos, se baja un nivel. Así un hábito marcado en el iPhone y
/// una tarea agregada en la Mac sobreviven los dos, en vez de que gane el
/// último que subió el documento entero.
///
/// - Objetos: clave por clave.
/// - Listas de objetos con `id` (tareas, hábitos, notas, grupos): por id. Lo
///   borrado de un lado se respeta salvo que el otro lo haya editado.
/// - Lo demás, si los dos lo cambiaron distinto: gana lo local.
///
/// Sin `base` (primera vez) no se puede saber qué se borró: se conserva todo.
enum JSONMerge {
    static func threeWay(base: JSONValue?, local: JSONValue, remote: JSONValue) -> JSONValue {
        if local == remote { return local }
        if let base {
            if local == base { return remote }
            if remote == base { return local }
        }
        switch (local, remote) {
        case let (.object(l), .object(r)):
            return .object(objects(base: base?.objectValue, local: l, remote: r))
        case let (.array(l), .array(r)):
            if let li = keyed(l), let ri = keyed(r) {
                var b: [(String, JSONValue)]?
                if case let .array(items)? = base { b = keyed(items) }
                return .array(lists(base: b, local: li, remote: ri))
            }
            return local
        default:
            return local
        }
    }

    private static func objects(base: [String: JSONValue]?, local: [String: JSONValue],
                                remote: [String: JSONValue]) -> [String: JSONValue] {
        var out: [String: JSONValue] = [:]
        for key in Set(local.keys).union(remote.keys) {
            if let v = one(base: base?[key], local: local[key], remote: remote[key], hasBase: base != nil) {
                out[key] = v
            }
        }
        return out
    }

    /// En el orden local; lo que sólo está en la nube va al final.
    private static func lists(base: [(String, JSONValue)]?, local: [(String, JSONValue)],
                              remote: [(String, JSONValue)]) -> [JSONValue] {
        let b = base.map { Dictionary($0, uniquingKeysWith: { a, _ in a }) }
        let r = Dictionary(remote, uniquingKeysWith: { a, _ in a })
        let localIds = Set(local.map(\.0))
        var out: [JSONValue] = []
        var vistos = Set<String>()
        for (id, item) in local where vistos.insert(id).inserted {
            if let v = one(base: b?[id], local: item, remote: r[id], hasBase: base != nil) { out.append(v) }
        }
        for (id, item) in remote where !localIds.contains(id) && vistos.insert(id).inserted {
            if let v = one(base: b?[id], local: nil, remote: item, hasBase: base != nil) { out.append(v) }
        }
        return out
    }

    /// Una parte que puede faltar en cualquiera de las tres copias.
    private static func one(base: JSONValue?, local: JSONValue?, remote: JSONValue?, hasBase: Bool) -> JSONValue? {
        switch (local, remote) {
        case let (l?, r?):
            return threeWay(base: base, local: l, remote: r)
        case let (l?, nil):
            // Estaba y la nube lo borró: se va, salvo que acá se haya editado.
            if hasBase, let base, l == base { return nil }
            return l
        case let (nil, r?):
            // Estaba y acá se borró: se va, salvo que la nube lo haya editado.
            if hasBase, let base, r == base { return nil }
            return r
        case (nil, nil):
            return nil
        }
    }

    /// La lista como pares (id, elemento), si todos son objetos con `id`.
    private static func keyed(_ items: [JSONValue]) -> [(String, JSONValue)]? {
        var out: [(String, JSONValue)] = []
        for item in items {
            guard let id = item.objectValue?["id"]?.stringValue, !id.isEmpty else { return nil }
            out.append((id, item))
        }
        return out
    }
}
