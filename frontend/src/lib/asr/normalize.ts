/**
 * Arabic normalization pipeline for ASR output.
 * Membersihkan teks Arab dari hasil transkripsi supaya cocok sama database Quran.
 */
export function normalizeArabic(text: string): string {
  return text
    // Remove tatwil/kashida (extender characters)
    .replace(/\u0640/g, "")
    // Remove harakat (fatha, kasra, damma, sukun)
    .replace(/[\u064B-\u0652]/g, "")
    // Remove shadda/tashdid
    .replace(/\u0651/g, "")
    // Remove superscript alef
    .replace(/\u0670/g, "")
    // Normalize alif variants (alif with madd, alif with hamza above/below, alif wasl) to bare alif
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "\u0627")
    // Normalize ya variants (alif maqsura, ya with dots below) to ya
    .replace(/[\u064A\u0649\u06CC]/g, "\u064A")
    // Normalize ta marbuta to ha
    .replace(/\u0629/g, "\u0647")
    // Normalize hamza (hamza above/below waw, hamza above ya, hamza alone) to bare hamza
    .replace(/[\u0624\u0626\u0621]/g, "\u0621")
    // Normalize waw with hamza
    .replace(/\u0624/g, "\u0648")
    // Remove tatwil/kashida again (some might be re-exposed)
    .replace(/\u0640/g, "")
    // Remove non-Arabic characters and punctuation
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669\s]/g, "")
    // Collapse multiple spaces
    .replace(/\s+/g, " ")
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
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
 * N-gram similarity: dice coefficient.
 */
export function ngramSimilarity(a: string, b: string, n: number = 3): number {
  const getNGrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      grams.add(s.substring(i, i + n));
    }
    return grams;
  };
  const gramsA = getNGrams(a);
  const gramsB = getNGrams(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let intersection = 0;
  for (const g of gramsA) {
    if (gramsB.has(g)) intersection++;
  }
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

/**
 * Cosine similarity based on character bigrams.
 */
export function cosineSimilarity(a: string, b: string): number {
  const getFeatures = (s: string): Map<string, number> => {
    const features = new Map<string, number>();
    for (let i = 0; i <= s.length - 2; i++) {
      const gram = s.substring(i, i + 2);
      features.set(gram, (features.get(gram) || 0) + 1);
    }
    return features;
  };
  const fa = getFeatures(a);
  const fb = getFeatures(b);
  let dot = 0, normA = 0, normB = 0;
  for (const [k, v] of fa) {
    dot += v * (fb.get(k) || 0);
    normA += v * v;
  }
  for (const [, v] of fb) normB += v * v;
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
