import SwiftUI

struct LoginSheet: View {
    @Environment(AuthService.self) private var auth
    @Environment(SyncService.self) private var sync
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var isWorking = false
    @State private var errorText: String?
    @State private var resetSent = false

    /// Un carácter que un mail no lleva, como la © que sale con Option+G.
    private var emailProblem: String? {
        let t = email.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return nil }
        let raro = t.unicodeScalars.first {
            !($0.isASCII && (CharacterSet.alphanumerics.contains($0) || "@._+-".unicodeScalars.contains($0)))
        }
        if let raro { return "El mail tiene \"\(raro)\", que un mail no lleva. ¿Querías otra letra?" }
        return nil
    }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !isWorking
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                RingMark(size: 26)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Entra con tu cuenta")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Palette.text)
                    Text("La misma que usas en la web. Tus hábitos se sincronizan.")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.textFaint)
                }
            }
            .padding(.bottom, 24)

            VStack(alignment: .leading, spacing: 9) {
                Text("Mail").microLabelStyle(Palette.textFaint, size: 9)
                DarkField(placeholder: "tu@mail.com", text: $email)
                    .textContentType(.username)
                if let emailProblem {
                    Text(emailProblem)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Palette.warning)
                }
            }
            .padding(.bottom, 18)

            VStack(alignment: .leading, spacing: 9) {
                Text("Contraseña").microLabelStyle(Palette.textFaint, size: 9)
                SecureField("", text: $password)
                    .textFieldStyle(.plain)
                    .textContentType(.password)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.text)
                    .padding(.horizontal, 12)
                    .frame(height: 38)
                    .background(Palette.surfaceRaised, in: RoundedRectangle(cornerRadius: Radius.control))
                    .overlay(RoundedRectangle(cornerRadius: Radius.control).stroke(Palette.hairlineFaint, lineWidth: 1))
                    .onSubmit(submit)
            }

            if let errorText {
                Text(errorText)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Palette.negative)
                    .padding(.top, 14)
            }

            // Si no la recuerdas: un mail con un enlace, que abre la web para
            // elegir una nueva. Después se entra aquí con esa.
            Group {
                if resetSent {
                    Text("Te mandamos un mail a \(email.trimmingCharacters(in: .whitespaces)). Abre el enlace, elige una contraseña nueva y vuelve aquí a entrar con ella.")
                        .font(.system(size: 11))
                        .foregroundStyle(Palette.positive)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Button("¿Olvidaste tu contraseña?", action: sendReset)
                        .buttonStyle(.pressable)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Palette.accent)
                }
            }
            .padding(.top, 14)

            Spacer(minLength: 26)

            HStack(spacing: 10) {
                Spacer()
                Button("Cancelar") { dismiss() }
                    .buttonStyle(.pressable)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Palette.textMuted)
                    .padding(.horizontal, 14)
                    .frame(height: 34)

                Button(action: submit) {
                    HStack(spacing: 6) {
                        if isWorking { ProgressView().controlSize(.small).tint(Palette.onAccent) }
                        Text(isWorking ? "Entrando…" : "Entrar")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(canSubmit ? Palette.onAccent : Palette.textFaint)
                    .padding(.horizontal, 20)
                    .frame(height: 34)
                    .background(Capsule().fill(canSubmit ? Palette.accent : Palette.fill(0.06)))
                    .shadow(color: canSubmit ? Palette.accent.opacity(0.35) : .clear, radius: 14, y: 3)
                    .contentShape(Capsule())
                }
                .buttonStyle(.pressable)
                .disabled(!canSubmit)
            }
        }
        .padding(26)
        .sheetWidth(420)
        .background(Palette.base)
    }

    private func sendReset() {
        let t = email.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { errorText = "Escribe tu mail arriba primero."; return }
        guard emailProblem == nil else { errorText = "Corrige el mail primero."; return }
        errorText = nil
        Task {
            do {
                try await auth.sendPasswordReset(email: t)
                withAnimation(.smooth(duration: 0.25)) { resetSent = true }
            } catch {
                errorText = (error as? LocalizedError)?.errorDescription ?? "No se pudo mandar el mail."
            }
        }
    }

    private func submit() {
        guard canSubmit else { return }
        isWorking = true
        errorText = nil
        Task {
            do {
                try await auth.signIn(email: email, password: password)
                await sync.didSignIn()
                dismiss()
            } catch {
                errorText = (error as? LocalizedError)?.errorDescription ?? "No se pudo entrar."
            }
            isWorking = false
        }
    }
}
