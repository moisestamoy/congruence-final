import Foundation

/// La parte del manifiesto que muestra la app nativa: la frase de identidad y
/// la meta de 90 días. En la web el manifiesto tiene más campos (creencias,
/// metas a un año, protocolo de ejecución…); esos viajan intactos dentro de
/// `HabitsDocument.manifesto` y la nativa sólo toca estos dos.
struct IdentityManifesto: Hashable {
    var identityStatement: String
    var ninetyDayGoal: String

    static let empty = IdentityManifesto(identityStatement: "", ninetyDayGoal: "")

    var isEmpty: Bool {
        identityStatement.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

/// Exactamente lo que guarda la columna `habits_data` de `user_data`:
/// `{ habits, manifesto }` más cualquier cosa que la web agregue después.
struct HabitsDocument: Codable, Hashable {
    var habits: [Habit]
    var manifesto: JSONValue?
    var extras: [String: JSONValue] = [:]

    init(habits: [Habit], manifesto: JSONValue? = nil) {
        self.habits = habits
        self.manifesto = manifesto
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        habits = try c.decodeIfPresent([Habit].self, forKey: AnyKey("habits")) ?? []
        manifesto = try c.decodeIfPresent(JSONValue.self, forKey: AnyKey("manifesto"))
        extras = try c.extras(excluding: ["habits", "manifesto"])
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(habits, forKey: AnyKey("habits"))
        try c.encodeIfPresent(manifesto, forKey: AnyKey("manifesto"))
        try c.encodeExtras(extras)
    }

    // MARK: - Lectura y escritura del manifiesto sin pisar el resto

    var identity: IdentityManifesto {
        get {
            let m = manifesto?.objectValue ?? [:]
            let goals = m["goals"]?.objectValue ?? [:]
            return IdentityManifesto(
                identityStatement: m["identityStatement"]?.stringValue ?? "",
                ninetyDayGoal: goals["ninetyDays"]?.stringValue ?? ""
            )
        }
        set {
            // Si no había manifiesto, se crea con la forma completa que espera
            // la web: su código lee `manifesto.identities.personal` y compañía
            // sin comprobar que existan, así que un objeto a medias la rompería.
            var m = manifesto?.objectValue ?? Self.emptyWebManifesto
            m["identityStatement"] = .string(newValue.identityStatement)
            var goals = m["goals"]?.objectValue ?? Self.emptyGoals
            goals["ninetyDays"] = .string(newValue.ninetyDayGoal)
            m["goals"] = .object(goals)
            manifesto = .object(m)
        }
    }

    private static let emptyGoals: [String: JSONValue] = [
        "oneYear": .string(""), "ninetyDays": .string(""), "antiGoals": .string("")
    ]

    private static let emptyWebManifesto: [String: JSONValue] = [
        "identityStatement": .string(""),
        "identities": .object(["personal": .string(""), "professional": .string(""),
                               "financial": .string("")]),
        "goals": .object(emptyGoals),
        "ignoranceDebt": .object(["missingSkill": .string(""),
                                  "investmentAction": .string("")]),
        "executionProtocol": .object(["planA_Action": .string(""),
                                      "planA_Volume": .string(""),
                                      "planB_Minimum": .string("")])
    ]
}
