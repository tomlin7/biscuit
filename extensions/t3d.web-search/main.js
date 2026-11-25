// Web Search extension: Google and GitHub search commands via t3d API

async function searchGoogle(t3d) {
  const state = await t3d.workspace.getState();
  const selected = state.activeDocument?.selectionText?.trim() || "";
  const query =
    selected ||
    (await t3d.window.showInputBox({ prompt: "Search Google for:" }))?.trim() ||
    "";
  if (!query) return;
  await t3d.env.openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
}

async function searchGitHubIssues(t3d) {
  const repoUrl = await t3d.scm.getRemoteUrl();
  if (!repoUrl) return;
  const state = await t3d.workspace.getState();
  const selected = state.activeDocument?.selectionText?.trim() || "";
  const query =
    selected ||
    (await t3d.window.showInputBox({ prompt: "Search issues for:" }))?.trim() ||
    "";
  const base = `${repoUrl.replace(/\/$/, "")}/issues`;
  const url = query ? `${base}?q=${encodeURIComponent(query)}` : base;
  await t3d.env.openExternal(url);
}

async function searchGitHubPullRequests(t3d) {
  const repoUrl = await t3d.scm.getRemoteUrl();
  if (!repoUrl) return;
  const state = await t3d.workspace.getState();
  const selected = state.activeDocument?.selectionText?.trim() || "";
  const query =
    selected ||
    (await t3d.window.showInputBox({ prompt: "Search pull requests for:" }))?.trim() ||
    "";
  const base = `${repoUrl.replace(/\/$/, "")}/pulls`;
  const url = query ? `${base}?q=${encodeURIComponent(query)}` : base;
  await t3d.env.openExternal(url);
}

async function openRepositoryOnGitHub(t3d) {
  const repoUrl = await t3d.scm.getRemoteUrl();
  if (!repoUrl) return;
  await t3d.env.openExternal(repoUrl);
}

export function activate(t3d, context) {
  context.subscriptions.push(
    t3d.commands.registerCommand("workbench.action.searchGoogle", () => searchGoogle(t3d)),
    t3d.commands.registerCommand("workbench.action.searchGitHubIssues", () => searchGitHubIssues(t3d)),
    t3d.commands.registerCommand("workbench.action.searchGitHubPullRequests", () => searchGitHubPullRequests(t3d)),
    t3d.commands.registerCommand("workbench.action.openRepositoryOnGitHub", () => openRepositoryOnGitHub(t3d))
  );
}

export function deactivate() {}
