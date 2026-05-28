"use client";
import { useEffect, useRef } from "react";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = 13;
    // AI/tech themed characters for thematic feel
    const chars = "01アイウエカキAPIGROKCLAUDEGPT><{}[]".split("");

    let drops: number[] = [];
    const initDrops = () => {
      const cols = Math.floor(canvas.offsetWidth / fontSize);
      drops = Array.from({ length: cols }, () => Math.random() * -120);
    };
    initDrops();

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      // Semi-transparent black → creates the trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, w, h);

      const cols = Math.floor(w / fontSize);
      if (drops.length !== cols) initDrops();

      for (let i = 0; i < cols; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Bright white-green leading character
        ctx.fillStyle = "#afffce";
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.fillText(char, x, y);

        // Green trail one step behind
        if (drops[i] > 2) {
          ctx.fillStyle = "#00cc66";
          ctx.font = `${fontSize}px "Courier New", monospace`;
          ctx.fillText(
            chars[Math.floor(Math.random() * chars.length)],
            x,
            y - fontSize
          );
        }

        // Faint deep-green echo two steps behind
        if (drops[i] > 4) {
          ctx.fillStyle = "rgba(0, 150, 60, 0.4)";
          ctx.fillText(
            chars[Math.floor(Math.random() * chars.length)],
            x,
            y - fontSize * 2
          );
        }

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.55;
      }
    };

    const id = setInterval(draw, 42);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-60"
    />
  );
}
