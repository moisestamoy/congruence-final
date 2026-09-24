import Foundation

/// La pregunta del día en el Diario.
///
/// Lo difícil de escribir un diario no es escribir: es la primera frase. Una
/// caja en blanco te pide inventar el tema *y* las palabras. Así que la
/// pregunta la pone la app, y la saca de lo que ya sabe de tu día — qué
/// hábitos cumpliste, qué tareas cerraste, cuánto llevas de racha. Ninguna
/// otra app de diario puede preguntarte eso, porque ninguna lo sabe.
struct DiaryPrompt {
    let text: String
    /// Lo que el dato dice, en una línea. Va sobre la pregunta, más chico.
    let context: String?

    /// - Parameters:
    ///   - percentage: congruencia del día, o -1 si está en pausa.
    ///   - missing: hábitos sin cumplir hoy.
    ///   - streak: días seguidos.
    ///   - tasksDone: tareas cerradas hoy.
    ///   - writtenDays: días de los últimos siete con alguna nota.
    static func forToday(percentage: Int,
                         missing: [String],
                         streak: Int,
                         tasksDone: Int,
                         writtenDays: Int,
                         isToday: Bool) -> DiaryPrompt {
        guard isToday else {
            return DiaryPrompt(text: "¿Qué pasó ese día?", context: nil)
        }

        // El día entero cumplido pide explicar el acierto, no el fallo.
        if percentage >= 100 {
            return DiaryPrompt(
                text: "Día completo. ¿Qué lo hizo posible?",
                context: streak > 1 ? "\(streak) días seguidos" : nil
            )
        }

        // Un hábito suelto sin cumplir es la pregunta más concreta que hay.
        if missing.count == 1, let solo = missing.first {
            return DiaryPrompt(
                text: "¿Qué pasó con \(solo.lowercased())?",
                context: percentage >= 0 ? "Hoy vas \(percentage)%" : nil
            )
        }

        if missing.count > 1 && percentage > 0 {
            return DiaryPrompt(
                text: "Quedaron \(missing.count) sin cumplir. ¿Cuál dolió más?",
                context: "Hoy vas \(percentage)%"
            )
        }

        // Nada marcado todavía: la pregunta es por el día, no por los hábitos.
        if percentage == 0 && tasksDone > 0 {
            return DiaryPrompt(
                text: "Cerraste \(tasksDone) tarea\(tasksDone == 1 ? "" : "s"). ¿Cuál importaba de verdad?",
                context: nil
            )
        }

        if percentage == 0 {
            return DiaryPrompt(
                text: "Todavía no marcaste nada. ¿En qué se te fue el día?",
                context: writtenDays > 0 ? "Escribiste \(writtenDays) de los últimos 7 días" : nil
            )
        }

        return DiaryPrompt(
            text: "¿Qué entendiste hoy que ayer no?",
            context: streak > 1 ? "\(streak) días seguidos" : nil
        )
    }
}
