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

Por ahora, local: `~/Library/Application Support/Congruence/habits.json`.

La sincronización con Supabase (misma tabla `user_data` que usa la web) es el
siguiente paso — hasta entonces la app nativa y la web no comparten datos.

## Estructura

```
Congruence/
  CongruenceApp.swift     punto de entrada
  Design/Theme.swift      colores y tipografía (espejo de src/index.css)
  Models/Habit.swift      Habit, HabitLog, el día que arranca a las 5 AM
  Stores/HabitStore.swift congruencia, racha, nivel, guardado en disco
  Views/                  anillo, fila de hábito, pantalla de hoy
```

Las reglas de negocio son un port directo de `src/features/habits/useHabitStore.ts`
y `HabitsPage.tsx`. Si cambian allá, hay que cambiarlas acá:

- El día arranca a las **5 AM**, no a medianoche.
- Congruencia `-1` significa **día en pausa**, no 0% — no es lo mismo.
- Niveles por racha: 14 / 30 / 60 / 200 / 365 días.
