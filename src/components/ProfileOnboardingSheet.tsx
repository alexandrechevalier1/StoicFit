import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import NumericKeypad from './NumericKeypad';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useThemeColors';
import { radius, spacing, typography } from '../theme/tokens';
import { Button, IconButton, ProgressBar } from './ui';
import { appendKeypadInput, parseDecimal, toDecimalInput } from '../utils/number';
import type {
  DailyActivityLevel,
  NutritionGoal,
  Sex,
  TrainingIntensity,
  UserProfile,
} from '../models';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  onComplete: (profile: UserProfile) => void;
  initialProfile?: UserProfile;
};

type ChoiceStep<T extends string> = {
  type: 'choice';
  key: keyof UserProfile;
  question: string;
  options: { label: string; value: T }[];
};

type NumberStep = {
  type: 'number';
  key: keyof UserProfile;
  question: string;
  unit: string;
  optional?: boolean;
  /** Autorise une virgule (ex. 72,5 kg). */
  decimal?: boolean;
  /** Nombre maximum de chiffres avant la virgule. */
  maxIntegerDigits: number;
};

type Step = ChoiceStep<Sex> | ChoiceStep<NutritionGoal> | ChoiceStep<DailyActivityLevel> | ChoiceStep<TrainingIntensity> | NumberStep;

const STEPS: Step[] = [
  {
    type: 'choice',
    key: 'sex',
    question: 'Quel est votre sexe ?',
    options: [
      { label: 'Homme', value: 'homme' },
      { label: 'Femme', value: 'femme' },
    ],
  },
  { type: 'number', key: 'age', question: 'Vous avez quel âge ?', unit: 'ans', maxIntegerDigits: 3 },
  {
    type: 'number',
    key: 'weightKg',
    question: 'Vous faites quel poids ?',
    unit: 'kg',
    decimal: true,
    maxIntegerDigits: 3,
  },
  {
    type: 'number',
    key: 'heightCm',
    question: 'Vous faites quelle taille ?',
    unit: 'cm',
    maxIntegerDigits: 3,
  },
  {
    type: 'number',
    key: 'bodyFatPercent',
    question: 'Taux de masse grasse estimé ?',
    unit: '%',
    optional: true,
    decimal: true,
    maxIntegerDigits: 2,
  },
  {
    type: 'choice',
    key: 'goal',
    question: 'Quel est votre objectif ?',
    options: [
      { label: 'Perte de poids', value: 'perte' },
      { label: 'Maintien', value: 'maintien' },
      { label: 'Prise de masse', value: 'prise' },
    ],
  },
  {
    type: 'number',
    key: 'targetWeightKg',
    question: 'Quel est votre poids cible ?',
    unit: 'kg',
    decimal: true,
    maxIntegerDigits: 3,
  },
  {
    type: 'choice',
    key: 'dailyActivityLevel',
    question: "Quel est votre niveau d'activité quotidien ?",
    options: [
      { label: 'Sédentaire', value: 'sedentaire' },
      { label: 'Légèrement actif', value: 'leger' },
      { label: 'Actif', value: 'actif' },
      { label: 'Très actif', value: 'tres_actif' },
    ],
  },
  {
    type: 'number',
    key: 'trainingFrequencyPerWeek',
    question: "Fréquence d'entraînement par semaine ?",
    unit: 'séances',
    maxIntegerDigits: 2,
  },
  {
    type: 'choice',
    key: 'trainingIntensity',
    question: "Quelle est l'intensité de vos entraînements ?",
    options: [
      { label: 'Faible', value: 'faible' },
      { label: 'Modérée', value: 'modere' },
      { label: 'Élevée', value: 'eleve' },
    ],
  },
];

export default function ProfileOnboardingSheet({
  visible,
  onRequestClose,
  onComplete,
  initialProfile,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);
    if (!initialProfile) {
      setDraft({});
      return;
    }
    setDraft({
      sex: initialProfile.sex,
      age: String(initialProfile.age),
      weightKg: toDecimalInput(initialProfile.weightKg),
      heightCm: String(initialProfile.heightCm),
      bodyFatPercent:
        initialProfile.bodyFatPercent !== undefined
          ? toDecimalInput(initialProfile.bodyFatPercent)
          : '',
      goal: initialProfile.goal,
      targetWeightKg: toDecimalInput(initialProfile.targetWeightKg),
      dailyActivityLevel: initialProfile.dailyActivityLevel,
      trainingFrequencyPerWeek: String(initialProfile.trainingFrequencyPerWeek),
      trainingIntensity: initialProfile.trainingIntensity,
    });
  }, [visible, initialProfile]);

  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const reset = () => {
    setStepIndex(0);
    setDraft({});
  };

  const handleClose = () => {
    reset();
    onRequestClose();
  };

  const buildProfile = (values: Record<string, string>): UserProfile => {
    const bodyFatPercent = parseDecimal(values.bodyFatPercent);
    return {
      sex: values.sex as Sex,
      age: parseDecimal(values.age) || 0,
      weightKg: parseDecimal(values.weightKg) || 0,
      heightCm: parseDecimal(values.heightCm) || 0,
      bodyFatPercent: Number.isFinite(bodyFatPercent) ? bodyFatPercent : undefined,
      goal: values.goal as NutritionGoal,
      targetWeightKg: parseDecimal(values.targetWeightKg) || 0,
      dailyActivityLevel: values.dailyActivityLevel as DailyActivityLevel,
      trainingFrequencyPerWeek: parseDecimal(values.trainingFrequencyPerWeek) || 0,
      trainingIntensity: values.trainingIntensity as TrainingIntensity,
    };
  };

  const goToNextStep = (values: Record<string, string>) => {
    if (isLastStep) {
      const profile = buildProfile(values);
      reset();
      onComplete(profile);
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handleChoiceSelect = (value: string) => {
    const values = { ...draft, [step.key]: value };
    setDraft(values);
    goToNextStep(values);
  };

  const handleNumberNext = () => {
    goToNextStep(draft);
  };

  const handlePrevious = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const currentValue = draft[step.key] ?? '';

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Fermer" />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            {stepIndex > 0 ? (
              <IconButton icon="chevron-back" label="Question précédente" tone="neutral" size={36} onPress={handlePrevious} />
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <View style={styles.progressBlock}>
              <ProgressBar progress={(stepIndex + 1) / STEPS.length} color={colors.primary} height={6} />
              <Text style={[typography.caption, { color: colors.subtleText }]}>
                Question {stepIndex + 1} sur {STEPS.length}
              </Text>
            </View>
            <IconButton icon="close" label="Fermer" tone="neutral" size={36} onPress={handleClose} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={[typography.title, { color: colors.text }]}>{step.question}</Text>

            {step.type === 'choice' ? (
              <View style={styles.optionsContainer}>
                {step.options.map((option) => {
                  const isSelected = draft[step.key] === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleChoiceSelect(option.value)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.optionButton,
                        { backgroundColor: isSelected ? colors.primarySoft : colors.cardMuted },
                        isSelected && { borderColor: colors.primary },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[typography.bodyStrong, styles.flex, { color: colors.text }]}>{option.label}</Text>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                        size={20}
                        color={isSelected ? colors.primary : colors.subtleText}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={styles.counterRow}>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{currentValue || '0'}</Text>
                  <Text style={[typography.headline, { color: colors.subtleText }]}>{step.unit}</Text>
                </View>
                <NumericKeypad
                  value={currentValue}
                  allowDecimal={step.decimal}
                  onDigitPress={(digit) =>
                    setDraft((prev) => ({
                      ...prev,
                      [step.key]: appendKeypadInput(prev[step.key] ?? '', digit, {
                        allowDecimal: step.decimal,
                        maxDecimals: 1,
                        maxIntegerDigits: step.maxIntegerDigits,
                      }),
                    }))
                  }
                  onDeletePress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      [step.key]: (prev[step.key] ?? '').slice(0, -1),
                    }))
                  }
                />

                <Button
                  label={isLastStep ? 'Terminer' : 'Suivant'}
                  icon={isLastStep ? 'checkmark' : undefined}
                  onPress={handleNumberNext}
                />

                {step.optional ? (
                  <Button label="Passer cette question" variant="plain" size="sm" onPress={handleNumberNext} />
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    height: '82%',
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerSpacer: { width: 36 },
  progressBlock: { flex: 1, alignItems: 'center', gap: spacing.xs },
  scrollContent: { paddingBottom: spacing.lg, gap: spacing.lg },
  optionsContainer: { gap: spacing.sm },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  counterRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.sm },
  counterValue: { fontSize: 48, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});
