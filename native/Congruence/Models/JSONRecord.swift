import Foundation

/// Un registro que ES su JSON original, con accesos tipados encima.
///
/// En Finanzas la web guarda campos que ni su propio tipo declara (`type` en los
/// gastos, `note` en los eventos) y un Atajo de iPhone escribe directo en la
/// base. Con este enfoque la app nativa no puede perder nada: lo que no toca,
/// viaja exactamente como llegó — mismas claves, mismos valores.
protocol JSONRecord: Codable, Hashable {
    var raw: [String: JSONValue] { get set }
    init(raw: [String: JSONValue])
}

extension JSONRecord {
    init(from decoder: Decoder) throws {
        self.init(raw: try [String: JSONValue](from: decoder))
    }

    func encode(to encoder: Encoder) throws {
        try raw.encode(to: encoder)
    }

    func string(_ key: String) -> String? { raw[key]?.stringValue }
    func double(_ key: String) -> Double? { raw[key]?.doubleValue }
    func bool(_ key: String) -> Bool? { raw[key]?.boolValue }

    /// `nil` borra la clave, igual que un campo `undefined` en la web.
    mutating func set(_ key: String, _ value: JSONValue?) {
        raw[key] = value
    }

    var json: JSONValue { .object(raw) }
}

extension JSONValue {
    var doubleValue: Double? {
        switch self {
        case .number(let n): return n
        case .string(let s): return Double(s)
        default: return nil
        }
    }

    var boolValue: Bool? { if case .bool(let b) = self { return b }; return nil }
    var arrayValue: [JSONValue]? { if case .array(let a) = self { return a }; return nil }

    static func from(_ value: Double?) -> JSONValue? { value.map(JSONValue.number) }
    static func from(_ value: String?) -> JSONValue? { value.map(JSONValue.string) }
    static func from(_ value: Bool?) -> JSONValue? { value.map(JSONValue.bool) }
}

extension Array where Element: JSONRecord {
    init(json: JSONValue?) {
        self = (json?.arrayValue ?? []).compactMap {
            guard case .object(let o) = $0 else { return nil }
            return Element(raw: o)
        }
    }

    var json: JSONValue { .array(map(\.json)) }
}
