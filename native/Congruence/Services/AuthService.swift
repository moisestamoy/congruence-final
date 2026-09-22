import Foundation
import Observation

struct AuthSession: Codable, Equatable {
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
    var userId: String
    var email: String
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case emailNotConfirmed
    case sessionExpired
    case server(String)
    case network

    var errorDescription: String? {
        switch self {
        case .invalidCredentials: return "Mail o contraseña incorrectos."
        case .emailNotConfirmed:  return "Tienes que confirmar tu mail primero."
        case .sessionExpired:     return "La sesión venció. Vuelve a entrar."
        case .server(let m):      return m
        case .network:            return "Sin conexión con Supabase."
        }
    }
}

/// Login con mail y contraseña contra Supabase Auth, por REST. Es el mismo
/// método que usa tu cuenta en la web.
@MainActor
@Observable
final class AuthService {
    private(set) var session: AuthSession?

    var isSignedIn: Bool { session != nil }

    init() {
        if let data = Keychain.load(),
           let saved = try? JSONDecoder().decode(AuthSession.self, from: data) {
            session = saved
        }
    }

    // MARK: - Entrar y salir

    func signIn(email: String, password: String) async throws {
        let body = ["email": email.trimmingCharacters(in: .whitespaces), "password": password]
        session = try await requestToken(grant: "password", body: body)
        persist()
    }

    func signOut() {
        session = nil
        Keychain.delete()
    }

    /// Un token válido para llamar a la base; si está por vencer, lo renueva.
    func validAccessToken() async throws -> String {
        guard let current = session else { throw AuthError.sessionExpired }
        if current.expiresAt.timeIntervalSinceNow > 60 { return current.accessToken }
        return try await refresh()
    }

    @discardableResult
    func refresh() async throws -> String {
        guard let current = session else { throw AuthError.sessionExpired }
        do {
            let renewed = try await requestToken(
                grant: "refresh_token",
                body: ["refresh_token": current.refreshToken]
            )
            session = renewed
            persist()
            return renewed.accessToken
        } catch AuthError.network {
            throw AuthError.network
        } catch {
            // El token de renovación ya no sirve: hay que volver a entrar.
            signOut()
            throw AuthError.sessionExpired
        }
    }

    // MARK: - Red

    private struct TokenResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let expires_in: Double
        let user: User
        struct User: Decodable { let id: String; let email: String? }
    }

    private struct ErrorResponse: Decodable {
        let error: String?
        let error_description: String?
        let error_code: String?
        let msg: String?
    }

    private func requestToken(grant: String, body: [String: String]) async throws -> AuthSession {
        var comps = URLComponents(url: SupabaseConfig.url.appendingPathComponent("auth/v1/token"),
                                  resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "grant_type", value: grant)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "POST"
        req.setValue(SupabaseConfig.publishableKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(body)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            throw AuthError.network
        }

        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else {
            let err = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            let code = err?.error_code ?? err?.error ?? ""
            if code == "email_not_confirmed" { throw AuthError.emailNotConfirmed }
            if code == "invalid_credentials" || code == "invalid_grant" { throw AuthError.invalidCredentials }
            throw AuthError.server(err?.msg ?? err?.error_description ?? "Error \(status) al entrar.")
        }

        let token = try JSONDecoder().decode(TokenResponse.self, from: data)
        return AuthSession(
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date().addingTimeInterval(token.expires_in),
            userId: token.user.id,
            email: token.user.email ?? body["email"] ?? session?.email ?? ""
        )
    }

    private func persist() {
        guard let session, let data = try? JSONEncoder().encode(session) else { return }
        Keychain.save(data)
    }
}
