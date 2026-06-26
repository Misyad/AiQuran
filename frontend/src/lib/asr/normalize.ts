/**
 * Enhanced Arabic normalization for ASR output matching.
 */
export function normalizeArabic(text: string): string {
  return text
    // Remove tatwil/kashida
    .replace(/\u0640/g, "")
    // Remove harakat (fatha, kasra, damma, sukun, tanwin)
    .replace(/[\u064B-\u0652]/g, "")
    // Remove shadda
    .replace(/\u0651/g, "")
    // Remove superscript alef
    .replace(/\u0670/g, "")
    // Normalize alif variants to bare alif
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "\u0627")
    // Normalize ya variants
    .replace(/[\u064A\u0649\u06CC]/g, "\u064A")
    // Normalize ta marbuta to ha
    .replace(/\u0629/g, "\u0647")
    // Normalize hamza
    .replace(/[\u0624\u0626]/g, "\u0621")
    // Remove non-Arabic
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]/g, "")
    // Collapse spaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Jaro-Winkler distance — better for short Arabic strings.
 * Returns similarity (0-1).
 */
export function jaroWinklerSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const lenA = a.length, lenB = b.length;
  if (lenA === 0 || lenB === 0) return 0;

  const matchDist = Math.floor(Math.max(lenA, lenB) / 2) - 1;
  const matchesA = new Array(lenA).fill(false);
  const matchesB = new Array(lenB).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(lenB, i + matchDist + 1);
    for (let j = start; j < end; j++) {
      if (matchesB[j]) continue;
      if (a[i] !== b[j]) continue;
      matchesA[i] = true;
      matchesB[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!matchesA[i]) continue;
    while (!matchesB[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / lenA + matches / lenB + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix boost
  let prefix = 0;
  const maxPrefix = Math.min(4, lenA, lenB);
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * N-gram Dice coefficient.
 */
export function ngramSimilarity(a: string, b: string, n: number = 3): number {
  const getGrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) grams.add(s.substring(i, i + n));
    return grams;
  };
  const ga = getGrams(a), gb = getGrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let intersection = 0;
  for (const g of ga) if (gb.has(g)) intersection++;
  return (2 * intersection) / (ga.size + gb.size);
}

/**
 * Bigram cosine similarity.
 */
export function cosineSimilarity(a: string, b: string): number {
  const getFeatures = (s: string): Map<string, number> => {
    const f = new Map<string, number>();
    for (let i = 0; i <= s.length - 2; i++) f.set(s.substring(i, i + 2), (f.get(s.substring(i, i + 2)) || 0) + 1);
    return f;
  };
  const fa = getFeatures(a), fb = getFeatures(b);
  let dot = 0, normA = 0, normB = 0;
  for (const [k, v] of fa) { dot += v * (fb.get(k) || 0); normA += v * v; }
  for (const [, v] of fb) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
