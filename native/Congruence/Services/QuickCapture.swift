#if os(macOS)
import AppKit
import Carbon.HIToolbox
import SwiftUI

/// Un atajo de teclado de todo el sistema: funciona con Congruence detrás de
/// otra app. Es Carbon (`RegisterEventHotKey`) y no un monitor de eventos,
/// porque éste no pide permiso de Accesibilidad y además se queda con la
/// tecla en vez de sólo mirarla pasar.
final class GlobalHotKey {
    private var ref: EventHotKeyRef?
    private let action: () -> Void

    /// El callback de Carbon es C puro y no puede capturar nada, así que busca
    /// el atajo por su id en esta tabla.
    nonisolated(unsafe) private static var registered: [UInt32: GlobalHotKey] = [:]
    nonisolated(unsafe) private static var handlerInstalled = false

    init?(keyCode: UInt32, modifiers: UInt32, id: UInt32, action: @escaping () -> Void) {
        self.action = action
        Self.installHandlerOnce()
        let hotKeyID = EventHotKeyID(signature: OSType(0x434F_4E47), id: id)  // "CONG"
        let status = RegisterEventHotKey(keyCode, modifiers, hotKeyID,
                                         GetApplicationEventTarget(), 0, &ref)
        // Si otra app ya tiene esa combinación, macOS la rechaza.
        guard status == noErr else { return nil }
        Self.registered[id] = self
    }

    private static func installHandlerOnce() {
        guard !handlerInstalled else { return }
        handlerInstalled = true
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                 eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, event, _ in
            var id = EventHotKeyID()
            GetEventParameter(event, EventParamName(kEventParamDirectObject),
                              EventParamType(typeEventHotKeyID), nil,
                              MemoryLayout<EventHotKeyID>.size, nil, &id)
            if let hotKey = GlobalHotKey.registered[id.id] {
                DispatchQueue.main.async { hotKey.action() }
            }
            return noErr
        }, 1, &spec, nil, nil)
    }
}

/// Un panel que acepta teclado sin traer al frente la ventana principal:
/// aparece encima de lo que estés usando, como Spotlight, y al cerrarse te
/// deja exactamente donde estabas.
private final class CapturePanel: NSPanel {
    override var canBecomeKey: Bool { true }
}

/// La captura rápida: ⌘⇧Espacio desde cualquier app, una línea, Enter.
///
/// Un pensamiento aparece cuando aparece, no cuando abres el Diario. Si
/// guardarlo exige cambiar de app y navegar, se pierde justo cuando la cabeza
/// está más cargada. Así que va desde donde estés, no pide título ni
/// categoría ni fecha, y queda como nota de hoy — ordenarla es otro momento.
@MainActor
final class QuickCapture {
    static let shared = QuickCapture()

    private var panel: CapturePanel?
    private var hotKey: GlobalHotKey?
    private weak var store: TaskStore?
    /// Si el atajo quedó registrado. Falla si otra app ya usa la combinación.
    private(set) var isActive = false

    func install(store: TaskStore) {
        self.store = store
        guard hotKey == nil else { return }
        hotKey = GlobalHotKey(keyCode: UInt32(kVK_Space),
                              modifiers: UInt32(cmdKey | shiftKey), id: 1) { [weak self] in
            self?.toggle()
        }
        isActive = hotKey != nil
        #if DEBUG
        // Para revisar el panel sin el atajo:
        // open Congruence.app --args -debugOpenCapture YES
        if UserDefaults.standard.bool(forKey: "debugOpenCapture") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.show() }
        }
        #endif
    }

    func toggle() {
        if let panel, panel.isVisible { close() } else { show() }
    }

    private func show() {
        let vista = QuickCaptureView(onSave: { [weak self] texto in self?.save(texto) },
                                     onCancel: { [weak self] in self?.close() })
        let panel = self.panel ?? makePanel()
        panel.contentView = NSHostingView(rootView: vista)
        position(panel)
        panel.makeKeyAndOrderFront(nil)
        self.panel = panel
    }

    private func makePanel() -> CapturePanel {
        let panel = CapturePanel(contentRect: NSRect(x: 0, y: 0, width: 580, height: 132),
                                 styleMask: [.nonactivatingPanel, .borderless],
                                 backing: .buffered, defer: false)
        panel.level = .floating
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.hidesOnDeactivate = false
        panel.isMovableByWindowBackground = true
        // Aparece en el escritorio en el que estés, también sobre apps a
        // pantalla completa.
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        return panel
    }

    /// Arriba y al centro de la pantalla con el cursor, donde está la mirada.
    private func position(_ panel: NSPanel) {
        let mouse = NSEvent.mouseLocation
        let screen = NSScreen.screens.first { $0.frame.contains(mouse) } ?? NSScreen.main
        guard let frame = screen?.visibleFrame else { return }
        let size = panel.frame.size
        panel.setFrameOrigin(NSPoint(x: frame.midX - size.width / 2,
                                     y: frame.maxY - size.height - frame.height * 0.18))
    }

    private func save(_ texto: String) {
        let limpio = texto.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !limpio.isEmpty, let store else { close(); return }
        store.addNote(title: Self.title(from: limpio), content: limpio)
        SoundEffects.shared.play(.bell, enabled: store.document.soundEnabled)
        close()
    }

    private func close() {
        panel?.orderOut(nil)
    }

    /// Las primeras palabras, sin cortar a mitad de una.
    private static func title(from texto: String) -> String {
        let primera = texto.split(separator: "\n").first.map(String.init) ?? texto
        let palabras = primera.split(separator: " ").prefix(7).joined(separator: " ")
        return palabras.count < primera.count ? palabras + "…" : palabras
    }
}

private struct QuickCaptureView: View {
    let onSave: (String) -> Void
    let onCancel: () -> Void

    @State private var text = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Palette.accent)
                ZStack(alignment: .leading) {
                    if text.isEmpty {
                        Text("¿Qué no quieres seguir sosteniendo?")
                            .font(.system(size: 19, design: .serif))
                            .foregroundStyle(Palette.textFaint.opacity(0.8))
                            .allowsHitTesting(false)
                    }
                    TextField("", text: $text)
                        .textFieldStyle(.plain)
                        .font(.system(size: 19, design: .serif))
                        .foregroundStyle(Palette.text)
                        .focused($focused)
                        .onSubmit { onSave(text) }
                }
            }

            Text("Enter lo guarda en el diario de hoy · Esc lo cierra")
                .font(.system(size: 10))
                .foregroundStyle(Palette.textFaint)
                .padding(.leading, 26)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 20)
        .frame(width: 580, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.hairline, lineWidth: 1))
        .onExitCommand(perform: onCancel)
        .onAppear {
            // El panel tarda un instante en volverse la ventana activa; sin esta
            // espera el foco llega antes y se pierde.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { focused = true }
        }
    }
}
#endif
