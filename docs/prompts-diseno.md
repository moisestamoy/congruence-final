# Prompts de diseño — Congruence

Para pegar en Figma Make (o cualquier herramienta de diseño por texto). Están en
inglés porque estas herramientas responden bastante mejor así; los textos que se
ven en pantalla van en español igual.

Los valores salen de `src/index.css` y de `native/Congruence/Design/Theme.swift`.
Si cambiás un color en el código, cambialo acá también.

---

## 1 · Pantalla principal (escritorio 1440×900)

```
Design a dark desktop app screen for a personal habit tracker called Congruence.
Frame 1440×900. Canvas background #0A0A0A.

LEFT RAIL — 88px wide, full height, fill #050505, 1px right border rgba(255,255,255,0.04).
- 24px from top: logo mark — three concentric rings in #22D3EE with a small filled
  dot at the center, 28×28, soft outer glow.
- Below it, four icon buttons 36×34, 8px apart, 10px corner radius: grid, wallet,
  checkbox, pie chart. The first is active: icon #22D3EE on a rgba(34,211,238,0.10)
  fill. The others #525252, no fill.
- Bottom: a small pill reading "ORDEN" — 8px uppercase, letterspacing 0.16em,
  #525252 on rgba(255,255,255,0.03), 6px radius. Under it a 30×30 rounded square,
  rgba(52,211,153,0.08), holding a green arrow-into-door icon #34D399.

CENTER — the ring is the hero. It floats directly on the canvas, NOT inside a card.
Center it horizontally in the space between the two side columns.
- Ring diameter 560px. Three concentric stroked circles, no fill, all stroke 33px:
  outer radius 224, middle radius 174, inner radius 124.
- Stroke color #2DD4BF at 20% / 50% / 100% opacity, outer to inner.
- Show the empty state: draw the three circles in #FFFFFF at 5.5% opacity instead,
  same radii and stroke.
- Behind the ring: a 310px circle of #2DD4BF at 8% opacity, 80px gaussian blur.
- 34px below the ring: "0%" in Outfit Bold 90px, #2DD4BF, soft cyan glow.
- 8px below: "ESTABILIDAD" in Outfit Bold 11px, uppercase, letterspacing 0.16em, #2DD4BF.
- 40px below: a quote in Cormorant Garamond Light Italic 13px, #525252, centered,
  max width 420px, line height 1.5, reading:
  "La consistencia no es perfección. Es simplemente no rendirse nunca."

LEFT COLUMN — 340px wide, 32px right of the rail. Two stacked cards, 20px apart.
Card style: fill #050505, 18px radius, 1px border rgba(255,255,255,0.04), 20px padding.

Card A — header: a 3×11 rounded bar in #22D3EE, 8px gap, then "TU IDENTIDAD" in
Outfit Bold 9px uppercase letterspacing 0.16em #A3A3A3. 22px gap, then a statement
in Outfit Bold 19px white, line height 1.45: "Soy una persona que siempre cumple lo
que dice y no se falla a sí mismo". 16px gap, then "90 DÍAS:" in Outfit Bold 11px
#22D3EE followed inline by body copy 11px #A3A3A3.

Card B — same header style, reading "PROGRESO 90 DÍAS". 18px gap, then baseline-
aligned: "0" Outfit Bold 40px white, "/90" 15px #525252, "días" 11px #525252.
16px gap: a 3px full-width track rgba(255,255,255,0.05) with a #22D3EE fill capsule.
14px gap: seven equal-width 3px capsules, 6px apart, rgba(255,255,255,0.06).
10px gap: "ÚLTIMA SEMANA" 8px uppercase letterspacing 0.16em #525252.

RIGHT COLUMN — 400px wide, 32px from the right edge, full height minus 32px padding.
One card: fill #050505, 18px radius, 1px border rgba(255,255,255,0.04), 20px padding.
- Header row: a 5px #22D3EE dot, 8px gap, "HÁBITOS" Outfit Bold 15px uppercase
  letterspacing 0.12em white. On the right: a 28×26 ghost button with a layout icon,
  then a pill (fill rgba(255,255,255,0.03), 1px border rgba(255,255,255,0.04), full
  radius) holding a left chevron, "20 Sep 2026" in Outfit SemiBold 11px tabular
  numbers #A3A3A3, and a right chevron.
- 16px gap, then six habit rows, 8px apart. Each row is 56px tall, fill #080808,
  12px radius, 1px border rgba(255,255,255,0.04), 16px horizontal padding. Left to
  right: a 20px empty circle outlined 1.5px rgba(255,255,255,0.10); 14px gap; a 15px
  emoji; 10px gap; the habit name in Outfit Bold 12px uppercase letterspacing 0.1em
  #A3A3A3; spacer; seven 4px dots in rgba(255,255,255,0.10), 5px apart.
  Rows: 💪 ENTRENAR · 🥑 ALIMENTACIÓN · 🌡 CONGRUENCE AL DÍA · 🌱 NP ·
  🧠 RUTINA DE MAÑANA · 🎸 APRENDER GUITARRA
- 8px gap: a full-width 44px button, 12px radius, 1px dashed border
  rgba(255,255,255,0.08), label "+ NUEVO OBJETIVO" Outfit Bold 10px uppercase
  letterspacing 0.16em #525252.
- Pinned to the bottom of the card: a Coach card. Fill rgba(139,92,246,0.05), 16px
  radius, 1px border rgba(139,92,246,0.18), 16px padding. Inside: a 28×28 rounded
  square rgba(139,92,246,0.12) holding a brain icon #8B5CF6; "Coach IA" Outfit Bold
  13px white with "ANÁLISIS DIARIO" 8px uppercase letterspaced #525252 beneath it;
  on the right a #8B5CF6 pill button with a sparkle icon and "Analizar" 11px white.
  Below that, a 10px-radius rgba(255,255,255,0.02) box with "Análisis personalizado
  de hábitos y finanzas" 11px #525252 and a right chevron.

TYPE — Outfit for all interface text. Cormorant Garamond for the italic quote only.
Tabular numbers everywhere a number appears.

RULES — no gradients on surfaces, no drop shadows on cards, no glassmorphism, no
background blobs. The only glow in the whole screen is around the ring and the
percentage. Borders are hairlines, never thicker than 1px.
```

**Para ver el anillo lleno** cambiá el bloque del centro por: outer arc 20% opacity,
middle 50%, inner 100%, todos recortados al 67% empezando arriba y girando en
sentido horario, con las puntas redondeadas. Y `"0%"` pasa a `"67%"`.

---

## 2 · Ícono de la app

El ícono actual ya es el anillo. Esto es para refinarlo, no para reemplazarlo: el
anillo es el concepto de la app.

```
Design an app icon. Frame 1024×1024, no rounded corners — the OS applies its own mask.

Background: a radial gradient from #0F1417 at the center to #050505 at the edges.

The mark: three concentric rings, centered, no fill.
- outer ring: radius 340, stroke 74, #2DD4BF at 20% opacity
- middle ring: radius 236, stroke 74, #2DD4BF at 55% opacity
- inner ring: radius 132, stroke 74, #2DD4BF at 100% opacity
- a solid #2DD4BF dot, 64px diameter, dead center

Behind the rings: a #2DD4BF glow at 25% opacity with 120px gaussian blur.

No text. No letters. No gradient on the rings themselves.
Give me the icon on a neutral grey background as well, so I can check the contrast.
```

### Tres variantes para comparar

Pedile las tres en el mismo archivo y mirálas chiquitas antes de decidir:

**A — Anillo puro.** El de arriba tal cual. Es lo que ya tenés.

```
Same icon, but simplify: only TWO rings instead of three — outer radius 320 stroke 96
at 35% opacity, inner radius 176 stroke 96 at 100% — plus the center dot at 88px.
Thicker strokes, fewer of them.
```

**B — Anillo con progreso.** Cuenta qué hace la app, no sólo cómo se llama.

```
Same three-ring icon, but the innermost ring is drawn as an arc covering 70% of the
circle, starting at the top and sweeping clockwise, with round caps. The remaining
30% stays as a #FFFFFF 6% opacity track. The two outer rings stay as full circles.
```

**C — Anillo con corte.** Más gráfico, más memorable de lejos.

```
Same three-ring icon, but cut a clean 40°-wide wedge out of all three rings at the
top, leaving a gap. No center dot. Increase all strokes to 96.
```

### Lo que hay que mirar sí o sí

- **A 16×16** (que es como se ve en el Dock y en Spotlight) tres anillos finos se
  funden en una mancha. Por eso la variante A de arriba usa dos anillos más gruesos.
  Exportá a 16, 32 y 64 y mirálo ahí antes que en grande.
- **En macOS** el arte no va a sangre: tiene que vivir dentro de un cuadrado
  redondeado de ~824×824 centrado en el lienzo de 1024, con el resto transparente.
  En iOS sí va a sangre, 1024×1024 completo.
- **Fondo claro.** El ícono se ve sobre el fondo del Dock, que puede ser claro. El
  turquesa sobre negro tiene que seguir leyéndose.

Cuando elijas uno, exportalo a 1024 PNG y lo meto en
`native/Congruence/Assets.xcassets/AppIcon.appiconset/` — ahí genero los tamaños
que faltan con `sips`.

---

## Los tokens, por si querés armarlo a mano

| | |
|---|---|
| Fondo | `#0A0A0A` |
| Superficie (tarjetas) | `#050505` |
| Superficie elevada (filas) | `#080808` |
| Borde | `rgba(255,255,255,0.10)` · hairline `0.04` |
| Texto | `#FFFFFF` · apagado `#A3A3A3` · tenue `#525252` |
| Acento | `#22D3EE` |
| Anillo nivel 1→6 | `#2DD4BF` `#06B6D4` `#D946EF` `#FBBF24` `#38BDF8` `#E2E8F0` |
| Positivo / negativo / atención | `#34D399` · `#FB7185` · `#FBBF24` |
| Coach | `#8B5CF6` |
| Tipografías | Outfit · Cormorant Garamond (itálica) · Courier Prime (mono) |
| Radios | tarjeta 18–24 · fila 12 · botón chico 6–10 |
| Etiqueta micro | 8–10px, bold, mayúscula, tracking 0.16em |
