import Foundation

/// Lo que se dijo en voz alta, pasado a datos de la app. El modelo de lenguaje
/// sólo copia las palabras ("el viernes", "es urgente", "lo de imperio"); la
/// fecha, el tipo y el grupo los decide este código. Así no inventa: si el
/// modelo calcula la fecha, se equivoca de día; si elige el grupo, pone uno
/// cualquiera aunque no lo hayas nombrado.
enum VoiceWords {
    /// El tipo por las palabras que usaste sobre la importancia.
    static func tier(from words: String) -> TaskTier? {
        let w = TaskStore.fold(words)
        guard !w.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        let secundaria = ["puede esperar", "secundari", "no es importante", "no urge",
                          "cuando pueda", "sin apuro", "no es prioridad", "baja prioridad"]
        let noBrain = ["no brain", "nobrain", "sin pensar", "rapid", "facil", "simple",
                       "cosa chica", "rapidito", "sencill"]
        let prioritaria = ["priorit", "urgent", "important", "clave", "critic", "palanca",
                           "lo primero", "si o si", "prioridad"]
        // Primero lo negativo: "no es importante" contiene "important".
        if secundaria.contains(where: w.contains) { return .minor }
        if noBrain.contains(where: w.contains) { return .easy }
        if prioritaria.contains(where: w.contains) { return .key }
        return nil
    }

    /// La fecha (AAAA-MM-DD) por las palabras que usaste sobre cuándo, o nil
    /// si no se entiende: mejor sin fecha que con una equivocada.
    static func date(from words: String, today: Date = HabitDay.current(),
                     calendar: Calendar = .current) -> String? {
        let w = " " + TaskStore.fold(words)
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { !$0.isEmpty }
            .joined(separator: " ") + " "
        guard w.trimmingCharacters(in: .whitespaces).count > 0 else { return nil }
        let hoy = calendar.startOfDay(for: today)
        func plus(_ d: Int) -> String { HabitDay.key(calendar.date(byAdding: .day, value: d, to: hoy)!) }

        if w.contains(" pasado manana ") { return plus(2) }
        if w.contains(" manana ") { return plus(1) }
        if w.contains(" hoy ") || w.contains(" esta noche ") || w.contains(" esta tarde ") { return plus(0) }
        if w.contains(" proxima semana ") || w.contains(" semana que viene ") {
            // El lunes que viene.
            let dia = calendar.component(.weekday, from: hoy)   // 1 = domingo
            return plus((9 - dia) % 7 == 0 ? 7 : (9 - dia) % 7)
        }

        // "el 3", "el 15 de noviembre", "3 de diciembre".
        let meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
                     "septiembre", "octubre", "noviembre", "diciembre"]
        let palabras = w.split(separator: " ").map(String.init)
        for (i, p) in palabras.enumerated() {
            guard let n = Int(p), (1...31).contains(n) else { continue }
            var mes: Int?
            if i + 2 < palabras.count, palabras[i + 1] == "de",
               let m = meses.firstIndex(of: palabras[i + 2]) { mes = m + 1 }
            else if i + 1 < palabras.count, let m = meses.firstIndex(of: palabras[i + 1]) { mes = m + 1 }
            let hoyC = calendar.dateComponents([.year, .month, .day], from: hoy)
            var c = DateComponents(year: hoyC.year, month: mes ?? hoyC.month, day: n)
            guard var fecha = calendar.date(from: c) else { continue }
            // Un día que ya pasó es del mes (o año) que viene.
            if fecha < hoy {
                if mes == nil { c.month = (hoyC.month ?? 1) + 1 } else { c.year = (hoyC.year ?? 0) + 1 }
                guard let siguiente = calendar.date(from: c) else { continue }
                fecha = siguiente
            }
            return HabitDay.key(fecha)
        }

        // Días de la semana: el próximo que venga, nunca hoy ("el martes"
        // dicho un martes es el de la semana que viene).
        let dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
        for (i, nombre) in dias.enumerated() where w.contains(" \(nombre) ") {
            let hoyDia = calendar.component(.weekday, from: hoy) - 1
            var faltan = (i - hoyDia + 7) % 7
            if faltan == 0 { faltan = 7 }
            return plus(faltan)
        }
        return nil
    }

    /// El grupo por las palabras que nombraste ("anto", "imperio", "axel"):
    /// el que empieza así, o el que sugieren tus tareas parecidas.
    ///
    /// `heard` es lo que de verdad se dijo: una palabra que el modelo puso pero
    /// que no está ahí no cuenta (el modelo a veces "completa" con un grupo).
    static func group(said: String, taskText: String, heard: String? = nil,
                      store: TaskStore) -> String? {
        let dicho = heard.map { " " + TaskStore.fold($0) + " " }
        let palabras = TaskStore.fold(said)
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.count >= 3 && (dicho?.contains($0) ?? true) }
        for palabra in palabras {
            if let g = store.group(matching: palabra) { return g.id }
        }
        return store.suggestGroup(for: palabras.joined(separator: " ") + " " + taskText)?.id
    }
}
