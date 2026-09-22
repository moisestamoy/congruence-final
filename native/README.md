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

Falta el runtime del simulador (Xcode → Settings → Components, ~10 GB). Sin él
se puede compilar igual conectando el iPhone por cable y eligiéndolo como destino
en Xcode. Hace falta poner un equipo de firma en **Signing & Capabilities**.

El código Swift ya compila limpio contra el SDK de iOS:

```bash
xcrun swiftc -typecheck -sdk $(xcrun --sdk iphoneos --show-sdk-path) \
  -target arm64-apple-ios17.0 $(find Congruence -name "*.swift")
```

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

## Pendiente conocido

La web calcula el saldo empezando un mes antes en zonas horarias al oeste de
Greenwich (ver el comentario de `FinanceEngine.walkStart`). La nativa lo
replica a propósito para que los saldos coincidan; hay que arreglarlo en las
dos apps a la vez y volver a cargar el "saldo actual".

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
