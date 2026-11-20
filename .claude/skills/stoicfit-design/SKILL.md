---
name: stoicfit-design
description: StoicFit's design system (React Native / Expo). Load it before creating or changing any screen, component or style in this app, so it stays visually consistent: palette, typography, spacing, shared components, French copy.
---

# StoicFit design system

The look is "stone & laurel": warm mineral backgrounds, a single green accent, white cards with no borders, large readable numbers. The app is used at the gym, phone in hand, between two sets. It has to read at a glance and be easy to tap.

## Non-negotiable rules

1. **No hard-coded colors.** Everything goes through `useThemeColors()` (`src/theme/colors.ts`). Never use `'#fff'`, `'#007AFF'` or `'#888'`. Text on `primary` uses `colors.onPrimary`.
2. **No emojis in the UI.** Icons are Ionicons only: `import Ionicons from '@expo/vector-icons/Ionicons'`, typed via `IconName` from `src/components/ui`. Use the `-outline` variant by default and the filled one for an active state.
3. **Every text uses a role from `typography`** (`src/theme/tokens.ts`). No loose `fontSize: 15` and no `fontWeight: 'bold'`.
4. **Spacing only from `spacing`** (4 / 8 / 12 / 16 / 24 / 32) and **radii only from `radius`** (8 / 12 / 16 / pill). The screen's side margin is `SCREEN_PADDING`.
5. **Never `paddingTop: 60`.** The top inset comes from `ScreenHeader` (`useSafeAreaInsets`). Sheets handle the bottom inset.
6. **Numbers**: `formatWeight` (« 22,5 », never « 100,00 »), `formatInteger` (« 12 450 »), `formatRelativeDay` (« Aujourd'hui », « Hier », « lun. 3 nov. ») from `src/utils/format.ts`. The unit is lowercase `kg`. Numeric values use `typography.number` / `numberLarge` (tabular digits), never a monospace font.
7. **Cards: background `colors.card`, no border**, `radius.lg`, padding `spacing.lg`. Inside a card, inset areas (fields, tracks, chips) use `colors.cardMuted`. A separator is a `StyleSheet.hairlineWidth` line in `colors.border`.
8. **Touch targets of at least 44 pt** (`TOUCH_TARGET`). Every button without text gets an `accessibilityLabel`.

## Colors

| Token | Use |
|---|---|
| `background` | screen background |
| `card` / `cardMuted` | surfaces / inset areas inside a card |
| `text` / `subtleText` | main text / secondary text |
| `primary` / `onPrimary` / `primarySoft` | main action / content on primary / tinted background (thumbnails, secondary buttons) |
| `success` / `warning` / `danger` | data states (goal met, over goal, destructive action), plus Faible / Modéré / Intense intensity |
| `protein` / `carbs` / `fat` / `water` | nutrition data colors: always the same hue for the same macro |

Never add a decorative color. When a datum needs a hue, add a token to **both** palettes.

## Shared components (`src/components/ui`)

- `ScreenHeader`: required at the top of every screen. Without `onBack` it shows a large title (tab screen). With `onBack` it is compact, with a chevron, title and subtitle. Actions go in `actions`.
- `Button`: `filled` (one main action per screen), `tinted` (secondary), `plain` (link or destructive with `tone="danger"`). Use `size="sm"` in headers.
- `IconButton`: icon only, in `plain`, `tinted` or `filled`. `label` is required.
- `EditableItemRow`: card row for lists (thumbnail, name, `note · meta`, chevron). In edit mode it shows fields and a trash button.
- `Thumbnail`: photo, or an icon on `primarySoft`. Shows a camera badge when editable.
- `EmptyState`: every empty list or screen. Icon, title, a sentence saying what to do, and an action when possible.
- `Sheet`: every modal or input form (bottom sheet, `size="large"` for numeric keypads).
- `ProgressBar`: gauges (macros, water, onboarding).

The `pickSquareImage()` helper (`src/utils/pickImage.ts`) is the only image picker.

## Screen patterns

- **Lists**: a `FlatList` whose `contentContainerStyle` has `SCREEN_PADDING`, `ItemSeparatorComponent` of `spacing.sm`, and an `EmptyState` in `ListEmptyComponent`. A computed summary (count, last set) goes in the secondary line.
- **Edit mode**: a `Modifier` / `Terminé` toggle as a `Button size="sm"` (`tinted`, then `filled` while active). Hide the + while editing.
- **Main action at the bottom** (for example "Ajouter une série"): a footer `View` with a hairline top border and a full-width `Button`.
- **No zeros on display**: when there is no data, show an `EmptyState` or hide the section rather than show "0 kg".
- **Charts**: bars on a fixed grid (`minSlots`) so a single bar never sits stretched or centered on its own. No border on chart cards.
- **Destructive actions** never go at the top of a screen. Put them at the bottom as `plain` + `danger`, always behind `confirmDestructive`.

## Copy (French)

- Always use accents: « Séances », « Évolution », « Cette année », « données ».
- Write « kg », « kcal », « L ». Put a space before the units and before « % ».
- Use French quotes « … » and the ellipsis character « … ».
- Address the user as « vous ». Labels are short verbs: « Ajouter une série », « Enregistrer ».
- Plurals go through `pluralize(count, 'séance')`, never « séance(s) ».

## Check

After any change: `npx tsc --noEmit`. Then review in light **and** dark mode (Profil → Thème sombre).
