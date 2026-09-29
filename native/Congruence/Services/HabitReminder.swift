import SwiftUI
import UserNotifications

/// Un recordatorio suave, a la hora que elijas, sólo los días en que todavía
/// no marcaste nada.
///
/// Una notificación que se repite todos los días no puede saltarse uno, así
/// que se programan los próximos siete días uno por uno. Al marcar un hábito,
/// el de hoy se quita; al abrir la app, se rellenan los que faltan.
enum HabitReminder {
    static let enabledKey = "habits.reminder.enabled"
    /// Minutos desde medianoche.
    static let minutesKey = "habits.reminder.minutes"
    static let defaultMinutes = 20 * 60

    private static let prefix = "habit-reminder-"

    static var isEnabled: Bool { UserDefaults.standard.bool(forKey: enabledKey) }

    static var minutes: Int {
        let m = UserDefaults.standard.object(forKey: minutesKey) as? Int
        return m ?? defaultMinutes
    }

    /// Pide permiso la primera vez. Si macOS lo niega, el interruptor vuelve
    /// a apagarse en vez de mentir.
    static func enable() async -> Bool {
        let ok = (try? await UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound])) ?? false
        UserDefaults.standard.set(ok, forKey: enabledKey)
        return ok
    }

    @MainActor
    static func reschedule(habits: HabitStore, now: Date = Date()) {
        let centro = UNUserNotificationCenter.current()
        let cal = Calendar.current
        // Los identificadores son el día, así que se sabe cuáles borrar sin
        // preguntar: borrar en el momento evita que un borrado tardío se
        // lleve los que se programan justo después.
        let dias = (-7..<8).compactMap { cal.date(byAdding: .day, value: $0, to: now) }
        centro.removePendingNotificationRequests(withIdentifiers: dias.map { prefix + HabitDay.key($0) })
        guard isEnabled, !habits.habits.isEmpty else { return }

        let hora = minutes / 60, minuto = minutes % 60
        for offset in 0..<7 {
            guard let dia = cal.date(byAdding: .day, value: offset, to: now),
                  let cuando = cal.date(bySettingHour: hora, minute: minuto, second: 0, of: dia),
                  cuando > now
            else { continue }
            let clave = HabitDay.key(dia)
            // Hoy, si ya marcaste algo (o el día está en pausa), no hace falta.
            if offset == 0 && habits.congruence(on: clave) != 0 { continue }

            let contenido = UNMutableNotificationContent()
            contenido.title = "Congruence"
            contenido.body = "¿Cómo va tu día? Marca lo que ya hiciste."
            contenido.sound = .default
            let partes = cal.dateComponents([.year, .month, .day, .hour, .minute], from: cuando)
            let pedido = UNNotificationRequest(
                identifier: prefix + clave, content: contenido,
                trigger: UNCalendarNotificationTrigger(dateMatching: partes, repeats: false))
            centro.add(pedido)
        }
    }
}

/// La hoja del recordatorio: encendido o no, y a qué hora.
struct HabitReminderSheet: View {
    @Environment(HabitStore.self) private var habits
    @Environment(\.dismiss) private var dismiss
    @AppStorage(HabitReminder.enabledKey) private var enabled = false
    @AppStorage(HabitReminder.minutesKey) private var minutes = HabitReminder.defaultMinutes
    @State private var denied = false

    private var time: Binding<Date> {
        Binding(
            get: {
                Calendar.current.date(bySettingHour: minutes / 60, minute: minutes % 60,
                                      second: 0, of: Date()) ?? Date()
            },
            set: { nueva in
                let c = Calendar.current.dateComponents([.hour, .minute], from: nueva)
                minutes = (c.hour ?? 20) * 60 + (c.minute ?? 0)
                HabitReminder.reschedule(habits: habits)
            }
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Recordatorio").font(.system(size: 20, weight: .bold)).foregroundStyle(Palette.text)
            Text("Una notificación a la hora que elijas, sólo los días en que todavía no marcaste nada. Si ya marcaste algo, no aparece.")
                .font(.system(size: 12)).foregroundStyle(Palette.textFaint)
                .fixedSize(horizontal: false, vertical: true)

            Toggle("Recordarme", isOn: Binding(
                get: { enabled },
                set: { quiere in
                    if quiere {
                        Task { @MainActor in
                            let ok = await HabitReminder.enable()
                            enabled = ok
                            denied = !ok
                            HabitReminder.reschedule(habits: habits)
                        }
                    } else {
                        enabled = false
                        HabitReminder.reschedule(habits: habits)
                    }
                }
            ))
            .toggleStyle(.switch)
            .tint(Palette.accent)

            if enabled {
                DatePicker("A las", selection: time, displayedComponents: .hourAndMinute)
                    .transition(.opacity)
            }
            if denied {
                Text("macOS no dio permiso. Se activa en Configuración del Sistema → Notificaciones → Congruence.")
                    .font(.system(size: 11)).foregroundStyle(Palette.warning)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Spacer()
                Button("Listo") { dismiss() }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Palette.accent)
                    .keyboardShortcut(.defaultAction)
            }
            .buttonStyle(.pressable)
        }
        .padding(26)
        .sheetWidth(400)
        .background(Palette.base)
        .animation(.smooth(duration: 0.25), value: enabled)
    }
}
