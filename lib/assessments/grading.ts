const STOP_WORDS = new Set([
  "about", "after", "also", "answer", "because", "been", "before", "being", "both", "could", "does", "doing",
  "done", "each", "example", "explain", "from", "have", "having", "into", "just", "like", "made", "make",
  "many", "mention", "more", "most", "much", "must", "only", "other", "over", "point", "points", "same",
  "should", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this",
  "those", "trainee", "very", "were", "what", "when", "where", "which", "while", "will", "with", "would",
  "your",
]);

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu;

function stem(word: string): string {
  return word.slice(0, Math.min(word.length, Math.max(4, word.length - 2)));
}

/** Distinctive words from a marking guide, in the order they first appear. */
export function keyTerms(modelAnswer: string, limit = 12): string[] {
  const terms: string[] = [];
  for (const raw of modelAnswer.toLowerCase().match(WORD_PATTERN) ?? []) {
    const word = raw.replace(/^['-]+|['-]+$/g, "");
    if (word.length < 4 || STOP_WORDS.has(word) || /^\d+$/.test(word)) {
      continue;
    }
    if (terms.some((term) => wordMatchesTerm(word, term))) {
      continue;
    }
    terms.push(word);
    if (terms.length >= limit) {
      break;
    }
  }
  return terms;
}

export function wordMatchesTerm(word: string, term: string): boolean {
  const candidate = word.toLowerCase();
  if (candidate.length < 4) {
    return false;
  }
  return candidate.startsWith(stem(term)) || term.startsWith(stem(candidate));
}

export function coveredTerms(text: string, terms: string[]): Set<string> {
  const words = text.match(WORD_PATTERN) ?? [];
  return new Set(terms.filter((term) => words.some((word) => wordMatchesTerm(word, term))));
}

export function highlightSegments(text: string, terms: string[]): Array<{ text: string; hit: boolean }> {
  if (terms.length === 0) {
    return [{ text, hit: false }];
  }
  const segments: Array<{ text: string; hit: boolean }> = [];
  let last = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index ?? 0;
    if (!terms.some((term) => wordMatchesTerm(match[0], term))) {
      continue;
    }
    if (start > last) {
      segments.push({ text: text.slice(last, start), hit: false });
    }
    segments.push({ text: match[0], hit: true });
    last = start + match[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last), hit: false });
  }
  return segments;
}
