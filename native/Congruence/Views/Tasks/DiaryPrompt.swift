import Foundation

/// Los hechos del día, ya reconstruidos por la app.
///
/// El usuario no debería tener que acordarse de cuántos hábitos cumplió ni de
/// cuántas tareas cerró: eso ya está guardado. Se muestran como contexto y lo
/// único que se le pide es la interpretación.
struct DiaryFacts {
    var congruence: Int          // -1 si está en pausa
    var habitsDone: Int
    var habitsTotal: Int
    var tasksDone: Int
    /// Sólo cuando hay algo que decir: el día proyecta déficit.
    var inDeficit: Bool

    /// Una línea corta por hecho. Máximo tres: más que eso convierte el diario
    /// en el panel de control que no debe ser.
    var lines: [String] {
        var out: [String] = []
        if congruence >= 0 && habitsTotal > 0 {
            out.append("Congruencia \(congruence)% · \(habitsDone)/\(habitsTotal) hábitos")
        }
        if tasksDone > 0 {
            out.append("\(tasksDone) tarea\(tasksDone == 1 ? "" : "s") cerrada\(tasksDone == 1 ? "" : "s")")
        }
        if inDeficit {
            out.append("Hoy en déficit")
        }
        return out
    }
}

/// La pregunta del día en el Diario.
///
/// Lo difícil de un diario no es escribir: es la primera frase. Una caja en
/// blanco te pide inventar el tema *y* las palabras. Así que la pregunta sale
/// de la mayor discrepancia del día —entre lo que te comprometiste y lo que
/// pasó—, que es un dato que la app ya tiene y ninguna otra app de diario
/// puede conocer.
struct DiaryPrompt {
    let text: String
    /// Lo que escribiste ayer y quedó pendiente de respuesta, si lo hay.
    var promise: String?

    // MARK: - La escalera de ayuda
    //
    // La ayuda aparece por niveles, no toda junta: seis opciones delante son
    // otra decisión que tomar, y la decisión es justo lo que hay que evitar
    // cuando no sabes por dónde empezar. Cada nivel sólo aparece si el
    // anterior no destrabó nada.

    /// Nivel 1: tres formas de empezar la frase.
    static let starters = ["Ahora mismo estoy pensando en",
                           "Lo que no quiero seguir sosteniendo es",
                           "Todavía no sé"]

    /// Nivel 2: una sola palabra. Para cuando ni siquiera hay frase.
    static let fragments = ["Pendiente", "Preocupación", "Idea",
                            "Conversación", "Decisión", "Cansancio"]

    /// Nivel 3: frases sin terminar, de una en una.
    static let openings = ["Hoy me está dando vueltas…",
                           "Algo que estoy evitando es…",
                           "Algo que me pesa aunque no parezca importante es…",
                           "No sé exactamente qué me pasa, pero…"]

    // MARK: - El barrido

    /// Una pregunta del barrido y el tema con el que empieza la nota si la
    /// eliges.
    struct SweepQuestion: Equatable {
        let question: String
        let topic: String
    }

    /// Para cuando no sabes qué escribir y lo pides. No es un tema que haya
    /// que inventar: es una lista de lugares donde mirar, una pregunta a la
    /// vez, que es como se vacía una cabeza llena (el "barrido mental").
    ///
    /// Primero lo que ya está abierto —las tareas en curso, el mes en rojo—
    /// porque eso es lo que más ocupa sin que lo notes. Después, lugares
    /// comunes donde se esconden los pendientes.
    static func sweep(doing: [String], oldestPending: String?,
                      inDeficit: Bool) -> [SweepQuestion] {
        var out: [SweepQuestion] = []
        for tarea in doing.prefix(2) {
            out.append(.init(question: "Tienes «\(tarea)» en curso. ¿Qué falta, o qué la frena?",
                             topic: tarea))
        }
        if inDeficit {
            out.append(.init(question: "El mes va en rojo. ¿Qué gasto o cobro te está rondando?",
                             topic: "Dinero"))
        }
        if let tarea = oldestPending, !doing.contains(tarea) {
            out.append(.init(question: "«\(tarea)» sigue pendiente. ¿Qué la traba?",
                             topic: tarea))
        }
        out += [
            .init(question: "¿Hay alguien a quien le debas una respuesta?", topic: "Pendiente con alguien"),
            .init(question: "¿Qué conversación estás postergando?", topic: "Conversación"),
            .init(question: "¿Qué decisión tienes a medio tomar?", topic: "Decisión"),
            .init(question: "¿Cómo está el cuerpo: sueño, energía, comida?", topic: "Cuerpo"),
            .init(question: "¿Algo de la casa o algún trámite que te ronde?", topic: "Trámite"),
            .init(question: "¿Una idea que no quieres perder?", topic: "Idea"),
            .init(question: "¿Qué te preocupa de mañana?", topic: "Mañana")
        ]
        if !inDeficit {
            out.insert(.init(question: "¿Algo de dinero: un pago, un cobro, una compra?",
                             topic: "Dinero"), at: min(out.count, doing.count + 3))
        }
        return out
    }

    static func forToday(facts: DiaryFacts,
                         missing: [String],
                         streak: Int,
                         writtenDays: Int,
                         yesterdayPromise: String?,
                         isToday: Bool) -> DiaryPrompt {
        guard isToday else {
            return DiaryPrompt(text: "¿Qué pasó ese día?")
        }

        // Una promesa de ayer manda sobre todo lo demás: es lo único que ya
        // tiene una respuesta pendiente, y contrastarla es de lo que trata
        // esta app.
        if let promise = yesterdayPromise {
            return DiaryPrompt(text: "Ayer dijiste esto. ¿Qué pasó?", promise: promise)
        }

        // El déficit es la discrepancia más cara del día.
        if facts.inDeficit {
            return DiaryPrompt(text: "Hoy cierra en déficit. ¿Qué decisión lo explica?")
        }

        if facts.congruence >= 100 {
            return DiaryPrompt(text: "Día completo. ¿Qué lo hizo posible?")
        }

        // Un hábito suelto sin cumplir es la pregunta más concreta que hay.
        if missing.count == 1, let solo = missing.first {
            return DiaryPrompt(text: "¿Qué hizo difícil \(solo.lowercased()) hoy?")
        }

        if missing.count > 1 && facts.congruence > 0 {
            return DiaryPrompt(text: "Quedaron \(missing.count) sin cumplir. ¿Cuál dolió más?")
        }

        if facts.congruence == 0 && facts.tasksDone > 0 {
            return DiaryPrompt(text: "Cerraste tareas pero no marcaste ningún hábito. ¿Qué pasó?")
        }

        if facts.congruence == 0 {
            return DiaryPrompt(text: "Todavía no marcaste nada. ¿En qué se te fue el día?")
        }

        return DiaryPrompt(text: "¿Qué entendiste hoy que ayer no?")
    }

    /// Busca en una nota una promesa a futuro. Es una heurística deliberada y
    /// no un modelo: basta con detectar la frase donde te comprometiste a algo
    /// para poder devolvértela mañana.
    static func findPromise(in note: String) -> String? {
        let marcas = ["mañana", "voy a", "haré", "me comprometo", "la próxima",
                      "a partir de mañana", "tengo que"]
        for linea in note.split(whereSeparator: { $0 == "\n" || $0 == "." }) {
            let texto = linea.trimmingCharacters(in: .whitespaces)
            guard texto.count > 12, texto.count < 220 else { continue }
            let bajo = texto.lowercased()
            if marcas.contains(where: bajo.contains) { return texto }
        }
        return nil
    }
}
