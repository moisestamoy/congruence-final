import Foundation

/// El manifiesto de identidad: la frase que define quién estás siendo y la
/// meta del arco de 90 días. Es lo que la app te devuelve, no una decoración.
struct IdentityManifesto: Codable, Hashable {
    var identityStatement: String
    var ninetyDayGoal: String

    static let empty = IdentityManifesto(identityStatement: "", ninetyDayGoal: "")

    var isEmpty: Bool {
        identityStatement.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
