/** Poids lisible : « 100 », « 22,5 », « 22,25 » (pas de « 100,00 »). */
export function formatWeight(weightKg: number): string {
  if (!Number.isFinite(weightKg)) return '0';
  return String(Math.round(weightKg * 100) / 100).replace('.', ',');
}

/** Grand nombre avec espaces de milliers : « 12 450 ». */
export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Date courte relative : « Aujourd'hui », « Hier », « lun. 3 nov. ». */
export function formatRelativeDay(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}
