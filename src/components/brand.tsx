import { Pencil } from "lucide-react";
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="SketchArena home">
      <span className="brand-icon">
        <Pencil size={20} strokeWidth={2.7} />
      </span>
      <span>
        sketch<span>arena</span>
        <span className="brand-dot">.</span>
      </span>
    </a>
  );
}
