import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import NumericKeypad from './NumericKeypad';
import { useThemeColors } from '../theme/useThemeColors';
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
  { type: 'number', key: 'age', question: 'Vous avez quel âge ?', unit: 'ans' },
  { type: 'number', key: 'weightKg', question: 'Vous faites quel poids ?', unit: 'kg' },
  { type: 'number', key: 'heightCm', question: 'Vous faites quelle taille ?', unit: 'cm' },
  {
    type: 'number',
    key: 'bodyFatPercent',
    question: 'Taux de masse grasse estimé ?',
    unit: '%',
    optional: true,
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
  { type: 'number', key: 'targetWeightKg', question: 'Quel est votre poids cible ?', unit: 'kg' },
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
      weightKg: String(initialProfile.weightKg),
      heightCm: String(initialProfile.heightCm),
      bodyFatPercent:
        initialProfile.bodyFatPercent !== undefined ? String(initialProfile.bodyFatPercent) : '',
      goal: initialProfile.goal,
      targetWeightKg: String(initialProfile.targetWeightKg),
      dailyActivityLevel: initialProfile.dailyActivityLevel,
      trainingFrequencyPerWeek: String(initialProfile.trainingFrequencyPerWeek),
      trainingIntensity: initialProfile.trainingIntensity,
    });
  }, [visible, initialProfile]);

  const colors = useThemeColors();
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

  const buildProfile = (values: Record<string, string>): UserProfile => ({
    sex: values.sex as Sex,
    age: Number(values.age) || 0,
    weightKg: Number(values.weightKg) || 0,
    heightCm: Number(values.heightCm) || 0,
    bodyFatPercent: values.bodyFatPercent ? Number(values.bodyFatPercent) : undefined,
    goal: values.goal as NutritionGoal,
    targetWeightKg: Number(values.targetWeightKg) || 0,
    dailyActivityLevel: values.dailyActivityLevel as DailyActivityLevel,
    trainingFrequencyPerWeek: Number(values.trainingFrequencyPerWeek) || 0,
    trainingIntensity: values.trainingIntensity as TrainingIntensity,
  });

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={handleClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            {stepIndex > 0 ? (
              <Pressable onPress={handlePrevious} hitSlop={12}>
                <Text style={[styles.headerButton, { color: colors.primary }]}>{'‹ Précédent'}</Text>
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Text style={[styles.progress, { color: colors.subtleText }]}>
              {stepIndex + 1} / {STEPS.length}
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text style={[styles.headerButton, { color: colors.primary }]}>{'✕'}</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.question, { color: colors.text }]}>{step.question}</Text>

            {step.type === 'choice' ? (
              <View style={styles.optionsContainer}>
                {step.options.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.optionButton, { borderColor: colors.primary }]}
                    onPress={() => handleChoiceSelect(option.value)}
                  >
                    <Text style={[styles.optionText, { color: colors.primary }]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.counterRow}>
                  <Text style={[styles.counterValue, { color: colors.text }]}>{currentValue || '0'}</Text>
                  <Text style={[styles.counterUnit, { color: colors.subtleText }]}>{step.unit}</Text>
                </View>
                <NumericKeypad
                  value={currentValue}
                  onDigitPress={(digit) =>
                    setDraft((prev) => ({ ...prev, [step.key]: (prev[step.key] ?? '') + digit }))
                  }
                  onDeletePress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      [step.key]: (prev[step.key] ?? '').slice(0, -1),
                    }))
                  }
                />

                <Pressable style={[styles.nextButton, { backgroundColor: colors.primary }]} onPress={handleNumberNext}>
                  <Text style={styles.nextButtonText}>
                    {isLastStep ? 'Terminer' : 'Suivant'}
                  </Text>
                </Pressable>

                {step.optional && (
                  <Pressable style={styles.skipButton} onPress={() => handleNumberNext()}>
                    <Text style={[styles.skipButtonText, { color: colors.subtleText }]}>Passer cette question</Text>
                  </Pressable>
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    height: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  headerSpacer: { width: 80 },
  progress: { fontSize: 14, color: '#888', fontWeight: '600' },
  scrollContent: { paddingBottom: 24 },
  question: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  optionsContainer: { gap: 12 },
  optionButton: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  optionText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  counterValue: { fontSize: 40, fontWeight: 'bold' },
  counterUnit: { fontSize: 18, color: '#888' },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  nextButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  skipButton: { alignItems: 'center', marginTop: 12 },
  skipButtonText: { fontSize: 14, color: '#888' },
});
