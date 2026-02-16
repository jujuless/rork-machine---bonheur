import { InspiringQuote } from '@/types';

export const INSPIRING_QUOTES: InspiringQuote[] = [
  { text: "Le bonheur n'est pas une destination, c'est une façon de voyager.", author: 'Margaret Lee Runbeck' },
  { text: 'Soyez le changement que vous voulez voir dans le monde.', author: 'Gandhi' },
  { text: 'Chaque jour est un nouveau départ.', author: 'Proverbe' },
  { text: "La vie est belle quand on sait la regarder.", author: 'Anonyme' },
  { text: "Le sourire est le soleil de l'âme.", author: 'Proverbe chinois' },
  { text: "Un acte de bonté, aussi petit soit-il, n'est jamais perdu.", author: 'Ésope' },
  { text: 'La gratitude transforme ce que nous avons en suffisance.', author: 'Melody Beattie' },
  { text: "Le bonheur se multiplie quand on le partage.", author: 'Bouddha' },
  { text: 'Rien de grand ne se fait sans passion.', author: 'Hegel' },
  { text: "La simplicité est la sophistication suprême.", author: 'Léonard de Vinci' },
  { text: "Il faut toujours viser la lune, car même en cas d'échec, on atterrit dans les étoiles.", author: 'Oscar Wilde' },
  { text: "Le plus grand bien que nous faisons aux autres n'est pas de leur communiquer notre richesse, mais de leur révéler la leur.", author: 'Louis Lavelle' },
];

export function getRandomQuote(): InspiringQuote {
  return INSPIRING_QUOTES[Math.floor(Math.random() * INSPIRING_QUOTES.length)];
}
