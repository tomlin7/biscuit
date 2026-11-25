import { convertFileSrc } from "@tauri-apps/api/core";
import { basename } from "../workspace/path";
import "./ImageView.css";

export function ImageView({ path }: { path: string }) {
  return (
    <div className="image-view">
      <img src={convertFileSrc(path)} alt={basename(path)} />
    </div>
  );
}
