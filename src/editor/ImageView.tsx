import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { basename } from "../workspace/path";
import { IconButton } from "../ui/IconButton";
import "./ImageView.css";

export function ImageView({ path }: { path: string }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [path]);

  return (
    <div className="image-view">
      <div className="image-view__toolbar">
        <IconButton
          icon={Minus}
          label="Zoom out"
          size={14}
          onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
        />
        <button
          type="button"
          className="image-view__zoom-label"
          title="Reset zoom"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton
          icon={Plus}
          label="Zoom in"
          size={14}
          onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
        />
        <IconButton icon={RotateCcw} label="Reset zoom" size={14} onClick={() => setZoom(1)} />
      </div>
      <div className="image-view__stage">
        <img
          src={convertFileSrc(path)}
          alt={basename(path)}
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  );
}
