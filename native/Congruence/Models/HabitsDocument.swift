import Foundation

/// Exactamente lo que guarda la columna `habits_data` de `user_data`:
/// `{ habits }` más cualquier cosa que la web agregue después.
///
/// Antes llevaba también `manifesto` (Mi Norte). Lo reemplazaron los Pilares,
/// que viven en `stats_data`; si una copia vieja todavía lo trae, se descarta
/// al leer para que no vuelva a subirse.
struct HabitsDocument: Codable, Hashable {
    var habits: [Habit]
    var extras: [String: JSONValue] = [:]

    init(habits: [Habit]) {
        self.habits = habits
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AnyKey.self)
        habits = try c.decodeIfPresent([Habit].self, forKey: AnyKey("habits")) ?? []
        extras = try c.extras(excluding: ["habits", "manifesto"])
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: AnyKey.self)
        try c.encode(habits, forKey: AnyKey("habits"))
        try c.encodeExtras(extras)
    }
}
