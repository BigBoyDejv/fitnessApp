# PREMIAD Design System - MASTER.md

Tento dokument definuje vizuálnu identitu a technické štandardy pre platformu **PREMIAD**. Riadi sa princípmi moderného fitness dizajnu: vysoký kontrast, energetická typografia a prémiová "Liquid Glass" estetika.

---

## 1. Farebná paleta (Color Tokens)

Navrhované zmeny:
- **Zlepšenie kontrastu**: Pôvodná tlmená farba (`#666`) bola na tmavom pozadí ťažko čitateľná. Zvyšujeme jej jas na `#8E8E93`.
- **Hĺbka čiernej**: Používame vrstvenú čiernu (Layered Black) pre lepšiu separáciu panelov.

| Token | Pôvodná Hex | Navrhovaná Hex | Účel |
| :--- | :--- | :--- | :--- |
| `--acid` | `#C8FF00` | `#D4FF00` | Primárna akcentová farba (Energetická žltá) |
| `--acid-glow` | - | `rgba(212, 255, 0, 0.3)` | Svetelný efekt pre aktívne prvky |
| `--bg-main` | `#0A0A0A` | `#050505` | Čisté hlboké pozadie |
| `--surface` | `#111111` | `#0F0F0F` | Primárna plocha panelov |
| `--surface-glass` | - | `rgba(20, 20, 20, 0.8)` | Sklenený efekt (Blur: 20px) |
| `--text-main` | `#F0F0F0` | `#FFFFFF` | Hlavný čitateľný text |
| `--text-muted` | `#666666` | `#8E8E93` | Doplnkové informácie (Vylepšený kontrast) |
| `--border` | `#222222` | `#1C1C1E` | Jemné deliace čiary |
| `--border-high` | `#2E2E32` | `#3A3A3C` | Aktívne okraje / Focus |

---

## 2. Typografia (Typography Scale)

Používame kombináciu dvoch fontov pre maximálny "energetic-fitness" pocit.

- **Display Font**: `Barlow Condensed` (900 Weight) - Titulky, KPI hodnoty, tlačidlá.
- **Body Font**: `DM Sans` (400-700 Weight) - Bežný text, popisy, formuláre.

| Štýl | Font | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **H1 (Page Title)** | Barlow | 2.0rem | 900 | 1.1 |
| **H2 (Section Header)** | Barlow | 1.5rem | 800 | 1.2 |
| **KPI Value** | Barlow | 2.4rem | 900 | 1.0 |
| **Body Large** | DM Sans | 1.0rem | 500 | 1.6 |
| **Body Regular** | DM Sans | 0.88rem | 400 | 1.5 |
| **Caption / Label** | DM Sans | 0.75rem | 700 | 1.4 |

---

## 3. Priestor a Mriežka (Spacing & Layout)

Používame **8px Grid systém**. Všetky hodnoty musia byť deliteľné 4 alebo 8.

- **Paddings**:
  - `Panel Padding`: `1.5rem` (24px)
  - `Button Padding`: `0.85rem 1.5rem`
  - `Icon Gap`: `0.8rem` (12px)
- **Margins**:
  - `Section Margin`: `2.0rem` (32px)
  - `Element Margin`: `0.75rem` (12px)

---

## 4. Zaoblenie a Tiene (Radius & Effects)

Cieľom je "sharp but safe" vzhľad.

- **Panel Radius**: `20px` (Moderný, priateľský vzhľad)
- **Component Radius**: `12px` (Tlačidlá, inputy, karty)
- **Avatar Radius**: `50%` (Circle)
- **Shadows**:
  - `Elevation 1`: `0 8px 16px rgba(0,0,0,0.3)`
  - `Glow (Acid)`: `0 0 15px rgba(212, 255, 0, 0.2)`

---

## 5. Interakčné pravidlá (Interaction Logic)

- **Hover (Buttons)**: Mierny posun nahor (-2px) + zvýšenie jasu.
- **Active (Click)**: "Haptic" zmenšenie na `scale(0.97)`.
- **Focus**: Vonkajší glow v `--acid` farbe (šírka 2px).
- **Empty States**: Vždy prítomná ilustrácia (opacity 0.2) + Primary CTA.

---

## 6. Checklist pre vývojára

- [ ] Je text čitateľný na pozadí? (Contrast Ratio > 4.5:1 pre bežný text)
- [ ] Majú tlačidlá minimálnu veľkosť 44x44px na mobile?
- [ ] Používam `rem` namiesto `px` pre responzivitu?
- [ ] Majú všetky sklenené panely `backdrop-filter: blur(20px)`?
