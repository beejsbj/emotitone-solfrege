export const SOURCE_REPO_URL = "https://github.com/beejsbj/emotitone-solfrege";

/**
 * Where the source of what is running lives: the tree at the deployed commit,
 * or the main tree when the build did not record one (local builds).
 * The commit is injected at build time (see vite.config.ts).
 */
export function sourceUrl(commit: string | undefined = import.meta.env.VITE_COMMIT_SHA): string {
  const sha = commit?.trim();
  return `${SOURCE_REPO_URL}/tree/${sha && /^[0-9a-f]{7,40}$/i.test(sha) ? sha : "main"}`;
}
