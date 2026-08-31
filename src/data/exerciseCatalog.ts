export interface CatalogExercise {
  name: string;
  category: string;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Pectoraux
  { name: 'Développé couché barre', category: 'Pectoraux' },
  { name: 'Développé couché haltères', category: 'Pectoraux' },
  { name: 'Développé incliné barre', category: 'Pectoraux' },
  { name: 'Développé incliné haltères', category: 'Pectoraux' },
  { name: 'Développé décliné', category: 'Pectoraux' },
  { name: 'Écarté couché haltères', category: 'Pectoraux' },
  { name: 'Écarté poulie vis-à-vis (Cable crossover)', category: 'Pectoraux' },
  { name: 'Pec deck (Butterfly)', category: 'Pectoraux' },
  { name: 'Pompes', category: 'Pectoraux' },
  { name: 'Dips (pectoraux)', category: 'Pectoraux' },

  // Dos
  { name: 'Tractions pronation', category: 'Dos' },
  { name: 'Tractions supination', category: 'Dos' },
  { name: 'Tirage vertical (Lat pulldown)', category: 'Dos' },
  { name: 'Tirage horizontal poulie basse', category: 'Dos' },
  { name: 'Rowing barre', category: 'Dos' },
  { name: 'Rowing haltère unilatéral', category: 'Dos' },
  { name: 'Rowing T-bar', category: 'Dos' },
  { name: 'Soulevé de terre', category: 'Dos' },
  { name: 'Soulevé de terre roumain', category: 'Dos' },
  { name: 'Pull-over', category: 'Dos' },
  { name: 'Hyperextensions lombaires', category: 'Dos' },
  { name: 'Face pull', category: 'Dos' },

  // Épaules
  { name: 'Développé militaire barre', category: 'Épaules' },
  { name: 'Développé militaire haltères', category: 'Épaules' },
  { name: 'Élévations latérales', category: 'Épaules' },
  { name: 'Élévations frontales', category: 'Épaules' },
  { name: 'Oiseau (élévations arrière)', category: 'Épaules' },
  { name: 'Rowing menton (Upright row)', category: 'Épaules' },
  { name: 'Arnold press', category: 'Épaules' },
  { name: 'Shrugs (haussements d\u2019épaules)', category: 'Épaules' },

  // Biceps
  { name: 'Curl barre', category: 'Biceps' },
  { name: 'Curl haltères', category: 'Biceps' },
  { name: 'Curl marteau', category: 'Biceps' },
  { name: 'Curl pupitre (Scott)', category: 'Biceps' },
  { name: 'Curl concentré', category: 'Biceps' },
  { name: 'Curl poulie basse', category: 'Biceps' },

  // Triceps
  { name: 'Extension triceps poulie haute', category: 'Triceps' },
  { name: 'Extension triceps nuque haltère', category: 'Triceps' },
  { name: 'Barre au front (Skull crusher)', category: 'Triceps' },
  { name: 'Dips (triceps)', category: 'Triceps' },
  { name: 'Développé couché prise serrée', category: 'Triceps' },
  { name: 'Kickback triceps', category: 'Triceps' },

  // Jambes
  { name: 'Squat barre', category: 'Jambes' },
  { name: 'Squat avant (Front squat)', category: 'Jambes' },
  { name: 'Presse à cuisses', category: 'Jambes' },
  { name: 'Fentes avant', category: 'Jambes' },
  { name: 'Fentes marchées', category: 'Jambes' },
  { name: 'Leg extension', category: 'Jambes' },
  { name: 'Leg curl (ischio-jambiers)', category: 'Jambes' },
  { name: 'Soulevé de terre jambes tendues', category: 'Jambes' },
  { name: 'Hip thrust', category: 'Jambes' },
  { name: 'Mollets debout (Standing calf raise)', category: 'Jambes' },
  { name: 'Mollets assis (Seated calf raise)', category: 'Jambes' },
  { name: 'Squat bulgare', category: 'Jambes' },

  // Abdominaux
  { name: 'Crunch', category: 'Abdominaux' },
  { name: 'Relevé de jambes', category: 'Abdominaux' },
  { name: 'Gainage (Planche)', category: 'Abdominaux' },
  { name: 'Gainage latéral', category: 'Abdominaux' },
  { name: 'Russian twist', category: 'Abdominaux' },
  { name: 'Crunch poulie haute', category: 'Abdominaux' },
  { name: 'Ab wheel (roulette abdominale)', category: 'Abdominaux' },

  // Cardio
  { name: 'Course à pied', category: 'Cardio' },
  { name: 'Vélo elliptique', category: 'Cardio' },
  { name: 'Rameur', category: 'Cardio' },
  { name: 'Corde à sauter', category: 'Cardio' },
  { name: 'Vélo stationnaire', category: 'Cardio' },
  { name: 'Burpees', category: 'Cardio' },
];
