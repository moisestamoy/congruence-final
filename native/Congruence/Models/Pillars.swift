import Foundation

/// Los cinco pilares. Los mismos ids que usa la web en `stats_data.pillars`.
enum PillarId: String, CaseIterable, Hashable, Identifiable {
    var id: String { rawValue }

    case mental, fisico, financiero, laboral, social

    var label: String {
        switch self {
        case .mental:     return "Mental"
        case .fisico:     return "Físico"
        case .financiero: return "Financiero"
        case .laboral:    return "Laboral"
        case .social:     return "Social"
        }
    }
}

/// Un pilar: dónde estás (A), a dónde vas (B), qué te frena y tu acción mínima.
/// Mismo formato que `PillarData` en la web; lo que no se conozca va a `extras`.
struct Pillar: Codable, Hashable {
    var puntoA = ""
    var puntoB = ""
    var scoreA = 5
    var scoreB = 8
    var quienSere = ""
    var barrera = ""
    var minimo = ""
    var enFoco = true
    var extras: [String: JSONValue] = [:]

    private static let known: Set<String> = [
        "id", "puntoA", "puntoB", "scoreA", "scoreB", "quienSere", "barrera", "minimo", "enFoco"
    ]

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        func text(_ k: String) -> String { (try? c.decodeIfPresent(String.self, forKey: AnyKey(k))) ?? "" }
        func score(_ k: String, _ def: Int) -> Int {
            guard let n = try? c.decodeIfPresent(Double.self, forKey: AnyKey(k)), n.isFinite else { return def }
            return min(10, max(1, Int(n.rounded())))
        }
        puntoA = text("puntoA")
        puntoB = text("puntoB")
        scoreA = score("scoreA", 5)
        scoreB = score("scoreB", 8)
        quienSere = text("quienSere")
        barrera = text("barrera")
        minimo = text("minimo")
        enFoco = (try? c.decodeIfPresent(Bool.self, forKey: AnyKey("enFoco"))) ?? true
        extras = (try? c.extras(excluding: Self.known)) ?? [:]
    }

    /// `id` lo pone el documento al guardar: acá no se sabe cuál es.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(puntoA, forKey: AnyKey("puntoA"))
        try c.encode(puntoB, forKey: AnyKey("puntoB"))
        try c.encode(scoreA, forKey: AnyKey("scoreA"))
        try c.encode(scoreB, forKey: AnyKey("scoreB"))
        if !quienSere.isEmpty { try c.encode(quienSere, forKey: AnyKey("quienSere")) }
        try c.encode(barrera, forKey: AnyKey("barrera"))
        try c.encode(minimo, forKey: AnyKey("minimo"))
        try c.encode(enFoco, forKey: AnyKey("enFoco"))
        try c.encodeExtras(extras)
    }

    /// Todavía no se escribió nada en él.
    var isBlank: Bool {
        [puntoA, puntoB, quienSere, barrera, minimo].allSatisfy {
            $0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }
}

/// Lo de un día: qué pilares se cumplieron y las tres respuestas de la noche.
struct DailyClose: Codable, Hashable {
    var date: String
    var done: [String: Bool] = [:]
    var hizo = ""
    var mejora = ""
    var evite = ""
    var extras: [String: JSONValue] = [:]

    init(date: String) { self.date = date }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        date = try c.decode(String.self, forKey: AnyKey("date"))
        done = (try? c.decodeIfPresent([String: Bool].self, forKey: AnyKey("done"))) ?? [:]
        hizo = (try? c.decodeIfPresent(String.self, forKey: AnyKey("hizo"))) ?? ""
        mejora = (try? c.decodeIfPresent(String.self, forKey: AnyKey("mejora"))) ?? ""
        evite = (try? c.decodeIfPresent(String.self, forKey: AnyKey("evite"))) ?? ""
        extras = (try? c.extras(excluding: ["date", "done", "hizo", "mejora", "evite"])) ?? [:]
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(date, forKey: AnyKey("date"))
        // La web espera los cinco, aunque sean falsos.
        var todos: [String: Bool] = [:]
        for id in PillarId.allCases { todos[id.rawValue] = done[id.rawValue] ?? false }
        try c.encode(todos, forKey: AnyKey("done"))
        try c.encode(hizo, forKey: AnyKey("hizo"))
        try c.encode(mejora, forKey: AnyKey("mejora"))
        try c.encode(evite, forKey: AnyKey("evite"))
        try c.encodeExtras(extras)
    }

    var hasAnswers: Bool { !(hizo.isEmpty && mejora.isEmpty && evite.isEmpty) }
    var isEmpty: Bool { !hasAnswers && !done.values.contains(true) }
}

/// La revisión de una semana: el puntaje de cada pilar y tres respuestas.
struct WeeklyReview: Codable, Hashable {
    var id: String
    var date: String
    var scores: [String: Int]
    var reflexion: String
    var mejora1pct: String
    var pospuse: String
    var extras: [String: JSONValue] = [:]

    init(id: String, date: String, scores: [String: Int], reflexion: String, mejora1pct: String, pospuse: String) {
        self.id = id; self.date = date; self.scores = scores
        self.reflexion = reflexion; self.mejora1pct = mejora1pct; self.pospuse = pospuse
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        id = try c.decode(String.self, forKey: AnyKey("id"))
        date = (try? c.decodeIfPresent(String.self, forKey: AnyKey("date"))) ?? ""
        let crudos = (try? c.decodeIfPresent([String: Double].self, forKey: AnyKey("scores"))) ?? [:]
        scores = crudos.mapValues { min(10, max(1, Int($0.rounded()))) }
        reflexion = (try? c.decodeIfPresent(String.self, forKey: AnyKey("reflexion"))) ?? ""
        mejora1pct = (try? c.decodeIfPresent(String.self, forKey: AnyKey("mejora1pct"))) ?? ""
        pospuse = (try? c.decodeIfPresent(String.self, forKey: AnyKey("pospuse"))) ?? ""
        extras = (try? c.extras(excluding: ["id", "date", "scores", "reflexion", "mejora1pct", "pospuse"])) ?? [:]
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(id, forKey: AnyKey("id"))
        try c.encode(date, forKey: AnyKey("date"))
        try c.encode(scores, forKey: AnyKey("scores"))
        try c.encode(reflexion, forKey: AnyKey("reflexion"))
        try c.encode(mejora1pct, forKey: AnyKey("mejora1pct"))
        try c.encode(pospuse, forKey: AnyKey("pospuse"))
        try c.encodeExtras(extras)
    }
}

/// Exactamente lo que la web guarda en `stats_data.pillars`:
/// `{ pillars, closes, reviews, themeStart }`.
struct PillarsDocument: Codable, Hashable {
    /// Por id de pilar. Siempre están los cinco.
    private(set) var pillars: [String: Pillar]
    var closes: [DailyClose]
    var reviews: [WeeklyReview]
    /// Cuándo empezó la rotación de temas semanales (ISO 8601).
    var themeStart: String
    var extras: [String: JSONValue] = [:]

    static var empty: PillarsDocument {
        PillarsDocument(pillars: [:], closes: [], reviews: [], themeStart: isoNow())
    }

    init(pillars: [String: Pillar], closes: [DailyClose], reviews: [WeeklyReview], themeStart: String) {
        self.pillars = Self.completos(pillars)
        self.closes = closes
        self.reviews = reviews
        self.themeStart = themeStart
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        pillars = Self.completos((try? c.decodeIfPresent([String: Pillar].self, forKey: AnyKey("pillars"))) ?? [:])
        // Un cierre o una revisión mal formados no tiran abajo el resto.
        closes = ((try? c.decodeIfPresent([Tolerante<DailyClose>].self, forKey: AnyKey("closes"))) ?? []).compactMap(\.value)
        reviews = ((try? c.decodeIfPresent([Tolerante<WeeklyReview>].self, forKey: AnyKey("reviews"))) ?? []).compactMap(\.value)
        let inicio = (try? c.decodeIfPresent(String.self, forKey: AnyKey("themeStart"))) ?? ""
        themeStart = Self.parse(inicio) == nil ? Self.isoNow() : inicio
        extras = (try? c.extras(excluding: ["pillars", "closes", "reviews", "themeStart"])) ?? [:]
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        var conId: [String: JSONValue] = [:]
        for id in PillarId.allCases {
            guard case .object(var o)? = try? JSONDecoder().decode(JSONValue.self, from: JSONEncoder().encode(self[id])) else { continue }
            o["id"] = .string(id.rawValue)
            conId[id.rawValue] = .object(o)
        }
        try c.encode(conId, forKey: AnyKey("pillars"))
        try c.encode(closes, forKey: AnyKey("closes"))
        try c.encode(reviews, forKey: AnyKey("reviews"))
        try c.encode(themeStart, forKey: AnyKey("themeStart"))
        try c.encodeExtras(extras)
    }

    subscript(id: PillarId) -> Pillar {
        get { pillars[id.rawValue] ?? Pillar() }
        set { pillars[id.rawValue] = newValue }
    }

    func close(on day: String) -> DailyClose? { closes.first { $0.date == day } }

    /// Nadie escribió nada todavía: no hay nada propio que cuidar.
    var isBlank: Bool {
        closes.allSatisfy(\.isEmpty) && reviews.isEmpty
            && PillarId.allCases.allSatisfy { self[$0].isBlank && self[$0].scoreA == 5 && self[$0].scoreB == 8 }
    }

    var themeStartDate: Date { Self.parse(themeStart) ?? Date() }

    /// Lo local manda en los pilares; los cierres y las revisiones se suman
    /// (por día y por id), así lo escrito en otro dispositivo no se pierde.
    static func merged(local: PillarsDocument, remote: PillarsDocument) -> PillarsDocument {
        var out = local
        let dias = Set(local.closes.map(\.date))
        out.closes = (local.closes + remote.closes.filter { !dias.contains($0.date) }).sorted { $0.date < $1.date }
        let ids = Set(local.reviews.map(\.id))
        out.reviews = (local.reviews + remote.reviews.filter { !ids.contains($0.id) }).sorted { $0.date < $1.date }
        // La rotación de temas arranca en la fecha más vieja de las dos.
        if let r = parse(remote.themeStart), let l = parse(local.themeStart), r < l { out.themeStart = remote.themeStart }
        for (k, v) in remote.extras where out.extras[k] == nil { out.extras[k] = v }
        return out
    }

    private static func completos(_ dados: [String: Pillar]) -> [String: Pillar] {
        var out = dados
        for id in PillarId.allCases where out[id.rawValue] == nil { out[id.rawValue] = Pillar() }
        return out
    }

    static func isoNow() -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: Date())
    }

    private static func parse(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: s) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: s)
    }
}

/// Decodifica un elemento de una lista sin que su error rompa la lista entera.
private struct Tolerante<T: Decodable>: Decodable {
    let value: T?
    init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}
