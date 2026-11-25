export type ScmRemoteAction =
  | "pull"
  | "push"
  | "fetch"
  | "stash"
  | "stashPop"
  | "createBranch";

type Listener = (action: ScmRemoteAction) => void;

let listener: Listener | null = null;

export function setScmRemoteListener(next: Listener | null) {
  listener = next;
}

export function requestScmRemote(action: ScmRemoteAction) {
  listener?.(action);
}
