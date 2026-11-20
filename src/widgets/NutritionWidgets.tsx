import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp } from 'react-native-android-widget';
import { DARK_COLORS, LIGHT_COLORS } from '../theme/colors';
import { formatInteger, formatWeight } from '../utils/format';
import type { NutritionWidgetData } from './widgetData';

// Noms déclarés dans app.json (plugin react-native-android-widget).
export const CALORIES_WIDGET = 'CaloriesSmall';
export const NUTRITION_WIDGET = 'NutritionMedium';
export const WIDGET_NAMES = [CALORIES_WIDGET, NUTRITION_WIDGET] as const;

// Un appui sur le widget ouvre l'onglet Nutrition (voir `linking` dans RootNavigator).
const OPEN_NUTRITION = { clickAction: 'OPEN_URI', clickActionData: { uri: 'stoicfit://nutrition' } } as const;

type Palette = {
  card: ColorProp;
  cardMuted: ColorProp;
  text: ColorProp;
  subtleText: ColorProp;
  primary: ColorProp;
  warning: ColorProp;
  protein: ColorProp;
  carbs: ColorProp;
  fat: ColorProp;
  water: ColorProp;
};

const palette = (isDark: boolean): Palette => {
  const c = isDark ? DARK_COLORS : LIGHT_COLORS;
  return {
    card: c.card as ColorProp,
    cardMuted: c.cardMuted as ColorProp,
    text: c.text as ColorProp,
    subtleText: c.subtleText as ColorProp,
    primary: c.primary as ColorProp,
    warning: c.warning as ColorProp,
    protein: c.protein as ColorProp,
    carbs: c.carbs as ColorProp,
    fat: c.fat as ColorProp,
    water: c.water as ColorProp,
  };
};

const ratio = (value: number, goal: number) => (goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0);

function ringSvg(progress: number, track: string, color: string, size: number) {
  const stroke = Math.max(8, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc =
    progress > 0
      ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${(circumference * progress).toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>${arc}</svg>`;
}

/** Anneau des calories avec le nombre restant au centre. */
function CaloriesRing({ data, colors, size }: { data: NutritionWidgetData; colors: Palette; size: number }) {
  const remaining = Math.round(data.caloriesGoal - data.calories);
  const isOver = remaining < 0;
  const ringColor = isOver ? colors.warning : colors.primary;

  return (
    <OverlapWidget style={{ width: size, height: size }}>
      <SvgWidget
        svg={ringSvg(ratio(data.calories, data.caloriesGoal), colors.cardMuted, ringColor, size)}
        style={{ width: size, height: size }}
      />
      <FlexWidget
        style={{ width: size, height: size, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <TextWidget
          text={formatInteger(Math.abs(remaining))}
          style={{ fontSize: Math.round(size * 0.22), fontWeight: '800', color: isOver ? colors.warning : colors.text }}
        />
        <TextWidget
          text={isOver ? 'en trop' : 'restantes'}
          style={{ fontSize: Math.max(10, Math.round(size * 0.1)), color: colors.subtleText }}
        />
      </FlexWidget>
    </OverlapWidget>
  );
}

function Bar({ progress, color, track }: { progress: number; color: ColorProp; track: ColorProp }) {
  const filled = Math.round(progress * 100);
  return (
    <FlexWidget
      style={{ width: 'match_parent', height: 6, flexDirection: 'row', backgroundColor: track, borderRadius: 3 }}
    >
      {filled > 0 ? <FlexWidget style={{ flex: filled, height: 6, backgroundColor: color, borderRadius: 3 }} /> : null}
      {filled < 100 ? <FlexWidget style={{ flex: 100 - filled, height: 6 }} /> : null}
    </FlexWidget>
  );
}

function MacroRow({
  label,
  value,
  goal,
  unit,
  colors,
}: {
  label: string;
  value: string;
  goal: string;
  unit: string;
  colors: Palette;
}) {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
      <TextWidget text={label} style={{ fontSize: 12, fontWeight: '600', color: colors.subtleText }} />
      <TextWidget
        text={`${value} / ${goal} ${unit}`}
        style={{ fontSize: 12, fontWeight: '600', color: colors.text }}
      />
    </FlexWidget>
  );
}

/** Widget 2×2 : anneau des calories restantes. */
export function CaloriesWidget({ data, width, height }: { data: NutritionWidgetData; width: number; height: number }) {
  const colors = palette(data.isDark);
  const ringSize = Math.max(72, Math.min(width - 24, height - 44));

  return (
    <FlexWidget
      {...OPEN_NUTRITION}
      accessibilityLabel={`Calories : ${formatInteger(data.calories)} sur ${formatInteger(data.caloriesGoal)}`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 12,
      }}
    >
      <CaloriesRing data={data} colors={colors} size={ringSize} />
      <TextWidget
        text={`${formatInteger(data.calories)} / ${formatInteger(data.caloriesGoal)} kcal`}
        style={{ fontSize: 12, fontWeight: '600', color: colors.subtleText, marginTop: 6 }}
        maxLines={1}
      />
    </FlexWidget>
  );
}

/** Widget 4×2 : calories + protéines, glucides, lipides et eau. */
export function NutritionWidget({ data, width, height }: { data: NutritionWidgetData; width: number; height: number }) {
  const colors = palette(data.isDark);
  const ringSize = Math.max(72, Math.min(height - 24, Math.round(width * 0.42)));

  const rows = [
    { label: 'Protéines', value: data.proteinG, goal: data.proteinGoal, unit: 'g', color: colors.protein },
    { label: 'Glucides', value: data.carbsG, goal: data.carbsGoal, unit: 'g', color: colors.carbs },
    { label: 'Lipides', value: data.fatG, goal: data.fatGoal, unit: 'g', color: colors.fat },
  ];

  return (
    <FlexWidget
      {...OPEN_NUTRITION}
      accessibilityLabel={`Nutrition du jour : ${formatInteger(data.calories)} kilocalories sur ${formatInteger(data.caloriesGoal)}`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 12,
        flexGap: 14,
      }}
    >
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
        <CaloriesRing data={data} colors={colors} size={ringSize} />
      </FlexWidget>

      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'center', flexGap: 5 }}>
        <TextWidget
          text={`${formatInteger(data.calories)} / ${formatInteger(data.caloriesGoal)} kcal`}
          style={{ fontSize: 14, fontWeight: '700', color: colors.text }}
          maxLines={1}
        />
        {rows.map((row) => (
          <FlexWidget key={row.label} style={{ width: 'match_parent', flexDirection: 'column', flexGap: 3 }}>
            <MacroRow
              label={row.label}
              value={formatInteger(row.value)}
              goal={formatInteger(row.goal)}
              unit={row.unit}
              colors={colors}
            />
            <Bar progress={ratio(row.value, row.goal)} color={row.color} track={colors.cardMuted} />
          </FlexWidget>
        ))}
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'column', flexGap: 3 }}>
          <MacroRow
            label="Eau"
            value={formatWeight(Math.round(data.waterMl / 100) / 10)}
            goal={formatWeight(Math.round(data.waterGoal / 100) / 10)}
            unit="L"
            colors={colors}
          />
          <Bar progress={ratio(data.waterMl, data.waterGoal)} color={colors.water} track={colors.cardMuted} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderNutritionWidget(widgetName: string, data: NutritionWidgetData, width: number, height: number) {
  return widgetName === NUTRITION_WIDGET ? (
    <NutritionWidget data={data} width={width} height={height} />
  ) : (
    <CaloriesWidget data={data} width={width} height={height} />
  );
}
