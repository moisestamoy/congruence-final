import Foundation

enum IdentityAxis: String, Codable, CaseIterable, Hashable {
    case physical, growth, financial, spiritual, social, mental

    var label: String {
        switch self {
        case .physical:  return "Físico"
        case .growth:    return "Crecimiento"
        case .financial: return "Financiero"
        case .spiritual: return "Espiritual"
        case .social:    return "Social"
        case .mental:    return "Mental"
        }
    }
}

enum HabitKind: String, Codable, Hashable {
    case boolean
    case numeric
}

/// Un día marcado como pausa no cuenta ni a favor ni en contra: es la regla de
/// gracia de la app. `rest` = descanso planificado, `emergency` = imprevisto.
enum LogStatus: String, Codable, Hashable {
    case rest
    case emergency
}

struct HabitLog: Codable, Hashable {
    var date: String
    var completed: Bool
    var value: Double?
    var status: LogStatus?
    var pauseReason: String?

    var isPaused: Bool { status == .rest || status == .emergency }
}

struct Habit: Codable, Identifiable, Hashable {
    var id: String
    var title: String
    var subtitle: String?
    var type: HabitKind
    var goal: Double
    var unit: String?
    var color: String
    var icon: String?
    var identityAxis: IdentityAxis?
    var logs: [String: HabitLog]
    var isDemo: Bool?

    func log(on day: String) -> HabitLog? { logs[day] }

    func progress(on day: String) -> Double {
        guard let log = logs[day] else { return 0 }
        switch type {
        case .boolean:
            return log.completed ? 1 : 0
        case .numeric:
            guard goal > 0 else { return log.completed ? 1 : 0 }
            return min((log.value ?? 0) / goal, 1)
        }
    }
}

// MARK: - El día de hábitos arranca a las 5 AM

enum HabitDay {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    /// Antes de las 5 AM seguís en el día anterior — igual que `getHabitDay()` en la web.
    static func current(_ now: Date = Date()) -> Date {
        let hour = Calendar.current.component(.hour, from: now)
        return hour < 5 ? Calendar.current.date(byAdding: .day, value: -1, to: now)! : now
    }

    static func key(_ date: Date) -> String { formatter.string(from: date) }

    static func adding(_ days: Int, to date: Date) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: date)!
    }
}
