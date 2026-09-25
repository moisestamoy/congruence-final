# Congruence — app nativa (iPhone + Mac)

App nativa en SwiftUI. **Un solo código para las dos plataformas** — no son dos
proyectos, es un target con `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator macosx"`.

Convive con la app web (`/src`): son la misma idea, no se pisan.

## Correr en Mac

```bash
cd native
xcodebuild -project Congruence.xcodeproj -scheme Congruence -destination 'platform=macOS' build
open ~/Library/Developer/Xcode/DerivedData/Congruence-*/Build/Products/Debug/Congruence.app
```

O abrir `Congruence.xcodeproj` en Xcode y darle ▶.

## Correr en iPhone

Hace falta el componente **iOS** de Xcode (Xcode → Settings → Components, o
`xcodebuild -downloadPlatform iOS`, unos 8 GB). Sin él Xcode no compila para
ningún iPhone, ni el simulador ni uno conectado por cable. Para instalarla en
tu teléfono además: tu Apple ID en Xcode → Settings → Accounts, ese equipo en
**Signing & Capabilities**, y el Modo desarrollador activado en el iPhone.

El código Swift ya compila limpio contra el SDK de iOS:

```bash
xcrun swiftc -typecheck -sdk $(xcrun --sdk iphoneos --show-sdk-path) \
  -target arm64-apple-ios17.0 $(find Congruence -name "*.swift")
```

### El diseño del teléfono

Se decide por el ancho, no por la plataforma (`Design/Compact.swift`): por
debajo de 700 puntos la barra lateral pasa a ser una barra de pestañas abajo
y cada pantalla se acomoda en una columna. Así se puede revisar en la Mac,
sin simulador:

```bash
open Congruence.app --args -debugPhone YES
```

abre la ventana del tamaño de un iPhone 16. Al volver a abrirla sin el
argumento recupera el tamaño que tenía.

## Dónde vive la data

En tu cuenta de Supabase, la misma que usa la web (tabla `user_data`,
columnas `habits_data` y `finances_data`). Entrás con tu mail y contraseña
desde el botón de abajo de la barra lateral; la sesión queda en el llavero
de macOS.

Copia local y respaldos en `~/Library/Application Support/Congruence/`
(`backups/` guarda las últimas 20 versiones distintas que bajaron de la nube).

Las reglas de sincronización están explicadas arriba de `SyncService.swift`.
Lo más importante: nunca escribe sin haber leído antes, sólo toca
`habits_data` y `finances_data`, y respeta los gastos que tu Atajo de iPhone
escribe directo en la base.

## Apariencia

Claro, oscuro o lo que diga el sistema. Se cambia con el botón de abajo de la
barra lateral y se recuerda (`appearance` en UserDefaults).

Los colores viven en `Design/Theme.swift` y se resuelven solos según la
apariencia (`Color(light:dark:)`), así que una vista nueva no tiene que saber
en qué modo está: alcanza con usar los tokens de `Palette`. Reglas:

- Nada de `Color.white.opacity(…)` suelto — sobre blanco desaparece. Va
  `Palette.fill(_:)`, que es blanco en oscuro y negro en claro.
- Un color que viene de datos (el de un hábito) se pasa por `Color.tint(hex:)`,
  que lo oscurece en claro para que se lea.
- Los resplandores van por `Palette.glow(_:_:)`: sobre blanco ensucian, así que
  casi desaparecen.
- Texto sobre el acento: `Palette.onAccent` (negro en oscuro, blanco en claro).

## Resuelto: el mes fantasma

La web calculaba el saldo empezando un mes antes al oeste de Greenwich: leía
`"2026-09-01"` como medianoche UTC, que en Bogotá es el 31 de agosto. La nativa
lo replicaba a propósito para que los saldos coincidieran. Se corrigió en las
dos a la vez (`FinancesPage.tsx` y `FinanceEngine.walkStart`): el mes se arma
desde sus partes, sin pasar por ninguna zona horaria. Si alguna vez calibraste
el "saldo actual" con el error presente, conviene volver a cargarlo.

## Estructura

```
Congruence/
  CongruenceApp.swift     punto de entrada
  Design/Theme.swift      colores y tipografía (espejo de src/index.css)
  Models/                 hábitos, finanzas, y el motor de proyección
  Stores/                 HabitStore, FinanceStore
  Services/               login, llavero, sincronización con Supabase
  Views/                  hoy (anillo y hábitos), Finance/ (planillas y hojas)
```

Las reglas de negocio son un port directo de `src/features/habits/useHabitStore.ts`
y `HabitsPage.tsx`. Si cambian allá, hay que cambiarlas acá:

- El día arranca a las **5 AM**, no a medianoche.
- Congruencia `-1` significa **día en pausa**, no 0% — no es lo mismo.
- Niveles por racha: 14 / 30 / 60 / 200 / 365 días.
