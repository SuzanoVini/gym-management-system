export interface DedupCandidate {
  id: string;
  email: string | null;
  phone: string | null;
  is_spam: boolean | null;
}

// Spam beats contact completeness so merging duplicates can never drop the flag.
export function pickDedupSurvivor<T extends DedupCandidate>(
  prior: T,
  current: T
): { keep: T; drop: T } {
  if (prior.is_spam && !current.is_spam) {
    return { keep: prior, drop: current };
  }
  if (current.is_spam && !prior.is_spam) {
    return { keep: current, drop: prior };
  }
  const score = (r: T) => (r.email ? 1 : 0) + (r.phone ? 1 : 0);
  return score(current) > score(prior)
    ? { keep: current, drop: prior }
    : { keep: prior, drop: current };
}
