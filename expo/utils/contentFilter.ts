export type ToxicityCategory = 'hate' | 'sexual' | 'violence' | 'harassment' | 'trauma' | 'drugs';
export type DangerLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ContentAnalysis {
  hasBannedContent: boolean;
  categories: ToxicityCategory[];
  score: number;
  dangerLevel: DangerLevel;
  matchedTerms: string[];
  sanitized: string;
  recommendation: 'allow' | 'review' | 'block';
}

interface BannedPattern {
  pattern: RegExp;
  category: ToxicityCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  label: string;
}

const BANNED_PATTERNS: BannedPattern[] = [
  // ── HATE SPEECH ────────────────────────────────────────────────────────
  { pattern: /\b(sale\s*(arabe|noir|juif|blanc|asiatique|reum|caf(ir|re)|bougnoule|youpin|feuj|goy|untermensch))\b/gi, category: 'hate', severity: 'critical', label: 'discours haineux racial' },
  { pattern: /\b(mort\s+aux?\s+(juifs?|arabes?|noirs?|blancs?|musulmans?|chr[eé]tiens?))\b/gi, category: 'hate', severity: 'critical', label: 'appel à la haine' },
  { pattern: /\b(nique\s+(ta|sa|la|votre|leur)\s*(race|m[eè]re|famille|religion|communaut[eé]))\b/gi, category: 'hate', severity: 'high', label: 'insulte haineuse' },
  { pattern: /\b(va\s+te\s+faire\s+(foutre|enc[uo]ler))\b/gi, category: 'hate', severity: 'high', label: 'insulte grave' },
  { pattern: /\b(p[ée]d[ée]|p[ée]d[ao]|homo\s*phob|trans\s*phob|islamophob|antisémit)\b/gi, category: 'hate', severity: 'high', label: 'discours de haine identitaire' },
  { pattern: /\b(nazis?|führer|heil\s*hitler|waffen\s*ss|kkk|white\s*power|suprémacist)\b/gi, category: 'hate', severity: 'critical', label: 'idéologie haineuse' },
  { pattern: /\b(dégage\s+(de\s+mon\s+pays|les?\s+(immigrés?|étrangers?|réfugiés?)))\b/gi, category: 'hate', severity: 'high', label: 'discours xénophobe' },

  // ── SEXUAL CONTENT ──────────────────────────────────────────────────────
  { pattern: /\b(porn[oe]|porno|pornographie|x{2,}|nudes?|sexto|sexting)\b/gi, category: 'sexual', severity: 'high', label: 'contenu pornographique' },
  { pattern: /\b(bite|queue|zizi|phallus|vagin|chatte|couille|sein\s*(nu|à\s+poil))\b/gi, category: 'sexual', severity: 'medium', label: 'termes sexuels explicites' },
  { pattern: /\b(baise[rz]?|niquer|enc[uo]ler|sodomie|masturbat|éjaculat|orgasme\s+explicit|fellation|cunnil)\b/gi, category: 'sexual', severity: 'high', label: 'contenu sexuel explicite' },
  { pattern: /\b(pédo(phil|porn)|inceste|viole[rz]?|agression\s+sexuelle)\b/gi, category: 'sexual', severity: 'critical', label: 'contenu sexuel criminel' },
  { pattern: /\b(prosti(tu[eé]e?|tion)|escorte\s+sexuelle|escort\s+girl|maquereau)\b/gi, category: 'sexual', severity: 'medium', label: 'contenu à caractère prostitutionnel' },
  { pattern: /\b(onlyfans\s+link|snap\s+nudes?|photo\s+(nue?s?|sexy)\s+contre)\b/gi, category: 'sexual', severity: 'medium', label: 'sollicitation sexuelle' },

  // ── VIOLENCE ────────────────────────────────────────────────────────────
  { pattern: /\b(je\s+(vais|veux)\s+(te|vous|lui|leur)\s+(tuer|buter|défoncer|exploser|massacrer|égorger|flinguer))\b/gi, category: 'violence', severity: 'critical', label: 'menace de mort explicite' },
  { pattern: /\b(menace\s+de\s+mort|mort\s+à|crève|va\s+crever|tu\s+vas\s+(crever|mourir|le\s+regretter))\b/gi, category: 'violence', severity: 'critical', label: 'menace mortelle' },
  { pattern: /\b(gore|snuff|décapita(tion|tion)|éviscér|torture|brûl[eé]\s+(vif|vivant)|lynchage)\b/gi, category: 'violence', severity: 'critical', label: 'contenu gore' },
  { pattern: /\b(attentat|terrorisme|terroriste|jihadiste|bombe\s+artisanale|arme\s+de\s+(guerre|destruction))\b/gi, category: 'violence', severity: 'critical', label: 'contenu terroriste' },
  { pattern: /\b(tabass[eé]|frapper|cogner|coups?|bless[eé]|sang\s+partout|bastonnade)\b/gi, category: 'violence', severity: 'medium', label: 'violence physique' },
  { pattern: /\b(fusil(ler|lade)|tir[eé]\s+dans|balle\s+dans\s+la\s+tête|couteau\s+dans)\b/gi, category: 'violence', severity: 'high', label: 'violence armée' },

  // ── HARASSMENT ──────────────────────────────────────────────────────────
  { pattern: /\b(connard|con(ne)?|salop(e|ard)|pute|putain\s+de|ordure|déchet|sous-merde|merde)\b/gi, category: 'harassment', severity: 'medium', label: 'insulte' },
  { pattern: /\b(t['']es?\s+(nul|nulle|inutile|pathétique|ridicule|débile|attardé|mongol))\b/gi, category: 'harassment', severity: 'medium', label: 'harcèlement' },
  { pattern: /\b(harcèlement|cyberharcèlement|doxxing|dox[eé]|swatting|mob(bing)?)\b/gi, category: 'harassment', severity: 'high', label: 'harcèlement organisé' },
  { pattern: /\b(ferme\s+ta\s+(gueule|bouche)|ta\s+gueule|dégage|casse[\s-]toi|va\s+te\s+faire)\b/gi, category: 'harassment', severity: 'medium', label: 'langage agressif' },
  { pattern: /\b(grosse?\s+(vache|baleine|lard|truie)|maigre\s+(squelette|anorexique))\b/gi, category: 'harassment', severity: 'medium', label: 'body shaming' },
  { pattern: /\b(fdp|fils?\s+de\s+(pute|chienne|pécor)|gros\s+(con|nul|débile))\b/gi, category: 'harassment', severity: 'high', label: 'insulte grave' },

  // ── TRAUMA / SELF-HARM ──────────────────────────────────────────────────
  { pattern: /\b(suicide|se\s+suicider|se\s+tuer|en\s+finir\s+avec\s+la\s+vie|mettre\s+fin\s+à\s+ses\s+jours)\b/gi, category: 'trauma', severity: 'critical', label: 'référence au suicide' },
  { pattern: /\b(se\s+bless[eé]|se\s+couper|scarification|automutilat|self.harm|cutting)\b/gi, category: 'trauma', severity: 'critical', label: 'automutilation' },
  { pattern: /\b(overdose|se\s+jeter|sauter\s+d['']un|prendre\s+trop\s+de\s+(pilules|médicaments)|pendaison)\b/gi, category: 'trauma', severity: 'critical', label: 'méthode de suicide' },
  { pattern: /\b(j['']en\s+peux\s+plus|plus\s+envie\s+de\s+vivre|la\s+vie\s+vaut\s+pas\s+la\s+peine)\b/gi, category: 'trauma', severity: 'high', label: 'détresse psychologique' },
  { pattern: /\b(viol[eé](e?)\s+(enfant|mineur)|trauma\s+sexuel|abusé\s+sexuellement)\b/gi, category: 'trauma', severity: 'critical', label: 'trauma sexuel' },

  // ── DRUGS ───────────────────────────────────────────────────────────────
  { pattern: /\b(cocaïne?|héroïne?|méthamphétamine|crystal\s*meth|fentanyl|crack\s+(à\s+vendre|dealer))\b/gi, category: 'drugs', severity: 'high', label: 'drogues dures' },
  { pattern: /\b(dealer|dealeur|revendre\s+de\s+la|acheter\s+de\s+la\s+(drogue|beuh|shit|coke|H))\b/gi, category: 'drugs', severity: 'high', label: 'trafic de drogue' },
  { pattern: /\b(joint|beuh|shit|weed|pétard|spliff|cannabis\s+(légal|illégal)|fumer\s+du\s+cannabis)\b/gi, category: 'drugs', severity: 'low', label: 'référence au cannabis' },
  { pattern: /\b(ecstasy|mdma|lsd|acide|champignon\s+(magique|hallucinogène)|kétamine|ghb)\b/gi, category: 'drugs', severity: 'high', label: 'drogues de synthèse' },
  { pattern: /\b(shoot[eé]\s+à|se\s+piquer|seringue\s+de|inject[eé]\s+de\s+la|sniff[eé])\b/gi, category: 'drugs', severity: 'high', label: 'consommation de drogues dures' },
];

const SEVERITY_SCORES: Record<'low' | 'medium' | 'high' | 'critical', number> = {
  low: 12,
  medium: 28,
  high: 50,
  critical: 80,
};

function normalizeLeetspeak(input: string): string {
  return input
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/\+/g, 't')
    .replace(/8/g, 'b')
    .replace(/\|/g, 'i');
}

function normalizeText(input: string): string {
  const leet = normalizeLeetspeak(input);
  return leet
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[*_\-\.]+/g, '')
    .toLowerCase();
}

export function containsBannedContent(input: string): ContentAnalysis {
  const normalized = normalizeText(input);
  const original = input;

  const matchedCategories = new Set<ToxicityCategory>();
  const matchedTerms: string[] = [];
  let totalScore = 0;
  let sanitized = original;

  for (const banned of BANNED_PATTERNS) {
    const normalizedTest = new RegExp(banned.pattern.source, banned.pattern.flags);
    const matches = normalized.match(normalizedTest);
    if (matches) {
      matchedCategories.add(banned.category);
      matchedTerms.push(banned.label);
      const contribution = Math.min(SEVERITY_SCORES[banned.severity] * matches.length, SEVERITY_SCORES[banned.severity] * 2);
      totalScore += contribution;
      sanitized = sanitized.replace(new RegExp(banned.pattern.source, banned.pattern.flags), (m) => '*'.repeat(m.length));
    }
  }

  const score = Math.min(Math.round(totalScore), 100);
  const categories = Array.from(matchedCategories);

  let dangerLevel: DangerLevel;
  if (score >= 70) dangerLevel = 'critical';
  else if (score >= 45) dangerLevel = 'high';
  else if (score >= 20) dangerLevel = 'medium';
  else dangerLevel = 'low';

  let recommendation: 'allow' | 'review' | 'block';
  if (dangerLevel === 'low') recommendation = 'allow';
  else if (dangerLevel === 'medium') recommendation = 'review';
  else recommendation = 'block';

  const uniqueTerms = [...new Set(matchedTerms)];

  return {
    hasBannedContent: score > 0,
    categories,
    score,
    dangerLevel,
    matchedTerms: uniqueTerms,
    sanitized,
    recommendation,
  };
}

export function sanitizeText(input: string): string {
  return containsBannedContent(input).sanitized;
}

export const CATEGORY_LABELS: Record<ToxicityCategory, { label: string; color: string; bg: string }> = {
  hate: { label: 'Discours haineux', color: '#F87171', bg: '#2A0808' },
  sexual: { label: 'Contenu sexuel', color: '#EC4899', bg: '#2D0820' },
  violence: { label: 'Violence', color: '#FB923C', bg: '#2A1000' },
  harassment: { label: 'Harcèlement', color: '#FBBF24', bg: '#231A04' },
  trauma: { label: 'Contenu traumatisant', color: '#A78BFA', bg: '#1E1040' },
  drugs: { label: 'Drogues', color: '#34D399', bg: '#052E16' },
};

export const DANGER_LEVEL_CONFIG: Record<DangerLevel, { label: string; color: string; bg: string; recommendation: string }> = {
  low: {
    label: 'Faible',
    color: '#4ADE80',
    bg: '#052E16',
    recommendation: 'Contenu autorisé',
  },
  medium: {
    label: 'Moyen',
    color: '#FBBF24',
    bg: '#231A04',
    recommendation: 'Demander modification',
  },
  high: {
    label: 'Élevé',
    color: '#FB923C',
    bg: '#2A1000',
    recommendation: 'Bloquer le contenu',
  },
  critical: {
    label: 'Critique',
    color: '#EF4444',
    bg: '#3A0000',
    recommendation: 'Bloquer immédiatement',
  },
};

export function analyzeImageSafety(imageUrl: string): { flagged: boolean; reason: string | null } {
  console.log('Seranova: Image safety check for:', imageUrl.slice(0, 60));
  const lower = imageUrl.toLowerCase();
  const suspiciousKeywords = ['nsfw', 'adult', 'explicit', 'nude', 'xxx', 'porn', 'gore', 'violence'];
  const flagged = suspiciousKeywords.some(kw => lower.includes(kw));
  return {
    flagged,
    reason: flagged ? 'URL contient des indicateurs de contenu inapproprié' : null,
  };
}

export function buildSafetyFeedbacks(analysis: ContentAnalysis): string[] {
  const feedbacks: string[] = [];

  if (analysis.score === 0) {
    feedbacks.push('✓ Aucun contenu problématique détecté. Votre message est sûr.');
    return feedbacks;
  }

  if (analysis.categories.includes('hate')) {
    feedbacks.push('⚠️ Discours haineux ou discriminatoire détecté — veuillez reformuler.');
  }
  if (analysis.categories.includes('sexual')) {
    feedbacks.push('🚫 Contenu sexuel explicite détecté — interdit sur Seranova.');
  }
  if (analysis.categories.includes('violence')) {
    feedbacks.push('🚫 Contenu violent ou menaces détectées — interdit sur Seranova.');
  }
  if (analysis.categories.includes('harassment')) {
    feedbacks.push('⚠️ Langage harcelant ou insultant détecté — veuillez reformuler.');
  }
  if (analysis.categories.includes('trauma')) {
    feedbacks.push('🔴 Contenu potentiellement traumatisant détecté — contenu bloqué pour protection des utilisateurs.');
  }
  if (analysis.categories.includes('drugs')) {
    feedbacks.push('⚠️ Références à des substances illicites détectées.');
  }

  if (analysis.dangerLevel === 'medium') {
    feedbacks.push('→ Ce contenu sera soumis à une révision manuelle par un modérateur.');
  } else if (analysis.dangerLevel === 'high' || analysis.dangerLevel === 'critical') {
    feedbacks.push('→ Ce contenu a été automatiquement bloqué pour protéger les utilisateurs.');
  }

  return feedbacks;
}
