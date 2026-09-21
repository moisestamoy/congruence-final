import Foundation

/// El mismo proyecto que usa la web. La clave es la publicable: es pública por
/// diseño (va dentro de la app, igual que en el bundle de la web) y sólo deja
/// hacer lo que permiten las reglas RLS de cada tabla — en `user_data`, que
/// cada usuario lea y edite únicamente su propia fila.
enum SupabaseConfig {
    static let url = URL(string: "https://vbtshztpqlliytgbdjzm.supabase.co")!
    static let publishableKey = "sb_publishable_gsiVp_k26aVQPPfd40oXyg_ovyhZKvj"
}
