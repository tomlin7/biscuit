import { useEffect, useRef } from "react";
import "./ResizeHandle.css";

type Axis = "x" | "y";

type Props = {
  axis: Axis;
  /** When axis=x and invert, dragging right decreases the sized panel (for left edge of AI). */
  invert?: boolean;
  onResize: (delta: number) => void;
  onDoubleClick?: () => void;
  label: string;
};

export function ResizeHandle({
  axis,
  invert = false,
  onResize,
  onDoubleClick,
  label,
}: Props) {
  const dragging = useRef(false);
  const last = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const pos = axis === "x" ? e.clientX : e.clientY;
      const raw = pos - last.current;
      last.current = pos;
      const delta = invert ? -raw : raw;
      if (delta !== 0) onResizeRef.current(delta);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.classList.remove("is-resizing-x", "is-resizing-y");
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [axis, invert]);

  return (
    <div
      className={
        axis === "x" ? "resize-handle resize-handle--x" : "resize-handle resize-handle--y"
      }
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        last.current = axis === "x" ? e.clientX : e.clientY;
        document.body.classList.add(axis === "x" ? "is-resizing-x" : "is-resizing-y");
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }}
      onDoubleClick={onDoubleClick}
    />
  );
}
