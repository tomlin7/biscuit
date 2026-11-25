// Keypress Display extension: shows chords in the status bar in real time

let enabled = false;
let statusBarItem = null;
let clearTimer = null;

function formatChord(event) {
  const parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey && event.key.length > 1) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  const key =
    event.key === " " ? "Space" : event.key.length === 1 ? event.key.toUpperCase() : event.key;
  if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
    parts.push(key);
  }
  return parts.length > 0 ? parts.join("+") : null;
}

export function activate(t3d, context) {
  statusBarItem = t3d.window.createStatusBarItem(t3d.StatusBarAlignment.Right, 100);
  statusBarItem.tooltip = "Keypress Display";
  statusBarItem.command = "workbench.action.toggleKeypressDisplay";

  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    t3d.commands.registerCommand("workbench.action.toggleKeypressDisplay", () => {
      enabled = !enabled;
      if (enabled) {
        statusBarItem.text = "Keys: …";
        statusBarItem.show();
        t3d.window.showInformationMessage("Keypress Display: On");
      } else {
        statusBarItem.hide();
        t3d.window.showInformationMessage("Keypress Display: Off");
      }
    })
  );

  context.subscriptions.push(
    t3d.window.onDidPressKey((event) => {
      if (!enabled) return;
      const chord = formatChord(event);
      if (!chord) return;
      statusBarItem.text = chord;
      statusBarItem.show();
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        if (enabled && statusBarItem) {
          statusBarItem.text = "…";
        }
      }, 1500);
    })
  );
}

export function deactivate() {
  if (statusBarItem) statusBarItem.dispose();
  if (clearTimer) clearTimeout(clearTimer);
}
