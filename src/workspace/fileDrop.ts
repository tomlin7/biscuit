import { useEffect, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export function useFileDrop(onDrop: (paths: string[]) => void) {
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type !== "drop" || event.payload.paths.length === 0) return;
        onDropRef.current(event.payload.paths);
      })
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(() => {
        /* The browser preview has no Tauri webview. */
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
