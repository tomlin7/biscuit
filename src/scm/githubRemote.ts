/** Normalize a git remote URL into an https://github.com/owner/repo page URL. */
export function githubWebUrlFromRemote(remote: string): string | null {
  const raw = remote.trim();
  if (!raw) return null;

  let ownerRepo: string | null = null;
  const ssh = raw.match(/^git@github\.com:(.+?)(?:\.git)?$/i);
  if (ssh) ownerRepo = ssh[1];
  const sshAlt = raw.match(/^ssh:\/\/git@github\.com\/(.+?)(?:\.git)?$/i);
  if (!ownerRepo && sshAlt) ownerRepo = sshAlt[1];
  const https = raw.match(/^https?:\/\/github\.com\/(.+?)(?:\.git)?$/i);
  if (!ownerRepo && https) ownerRepo = https[1];

  if (!ownerRepo) return null;
  const cleaned = ownerRepo.replace(/\/+$/, "");
  if (!cleaned.includes("/")) return null;
  return `https://github.com/${cleaned}`;
}

export function githubIssuesSearchUrl(repoWebUrl: string, query = ""): string {
  const base = `${repoWebUrl.replace(/\/$/, "")}/issues`;
  if (!query.trim()) return base;
  return `${base}?q=${encodeURIComponent(query.trim())}`;
}

export function githubPullsSearchUrl(repoWebUrl: string, query = ""): string {
  const base = `${repoWebUrl.replace(/\/$/, "")}/pulls`;
  if (!query.trim()) return base;
  return `${base}?q=${encodeURIComponent(query.trim())}`;
}

export function githubPullRequestUrl(repoWebUrl: string, branch?: string, base = "main"): string {
  const clean = repoWebUrl.replace(/\/+$/, "");
  if (!branch || branch === base || branch === "master") {
    return `${clean}/pulls`;
  }
  return `${clean}/compare/${encodeURIComponent(base)}...${encodeURIComponent(branch)}?expand=1`;
}

