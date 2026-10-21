import { CANVAS, type Stroke } from "@shared/protocol";
export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (!stroke.points.length) return;
  ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const first = stroke.points[0];
  if (stroke.points.length === 1) {
    ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.moveTo(first.x, first.y);
  for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();
}
export function paintAll(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  strokes.forEach((stroke) => paintStroke(ctx, stroke));
}
export function downloadCanvas(canvas: HTMLCanvasElement) {
  const link = document.createElement("a");
  link.download = "sketcharena-masterpiece.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
