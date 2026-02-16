export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "À l'instant";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Il y a ${weeks} sem.`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Il y a ${months} mois`;

  const years = Math.floor(days / 365);
  return `Il y a ${years} an${years > 1 ? 's' : ''}`;
}

export const REASON_LABELS: Record<string, string> = {
  fake_news: 'Fake News / Désinformation',
  insults: 'Insultes / Harcèlement',
  nudity: 'Nudité / Contenu explicite',
  ai_content: 'Contenu généré par IA',
  other: 'Autre',
};
