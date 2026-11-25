const KEY = "t3d.diff.ignoreSpace";

export function readIgnoreSpacePref(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeIgnoreSpacePref(value: boolean) {
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}
