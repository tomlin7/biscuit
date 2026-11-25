import { useEffect, useRef } from "react";
import { useSettings } from "../settings/SettingsContext";
import { useWorkspace } from "./WorkspaceContext";

/** Debounced auto-save for dirty tabs when enabled in settings. */
export function AutoSave() {
  const { settings } = useSettings();
  const { tabs, saveDirtyAuto } = useWorkspace();
  const delay = settings.editor.autoSaveMs;
  const dirtyKey = tabs
    .filter((tab) => tab.value !== tab.baseline)
    .map((tab) => `${tab.path}:${tab.value.length}`)
    .join("|");
  const saveRef = useRef(saveDirtyAuto);
  saveRef.current = saveDirtyAuto;

  useEffect(() => {
    if (!delay || !dirtyKey) return;
    const id = window.setTimeout(() => {
      void saveRef.current();
    }, delay);
    return () => window.clearTimeout(id);
  }, [delay, dirtyKey]);

  return null;
}
