import { useEffect, useRef } from 'react';

const COLORS = ['#f97316', '#e11d48', '#7c3aed', '#3b82f6', '#059669', '#f59e0b', '#ec4899', '#06b6d4'];

interface Piece {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number; color: string; size: number; shape: 'rect' | 'circle';
  alpha: number;
}

export const Confetti = ({ active, onDone }: { active: boolean; onDone?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const pieces    = useRef<Piece[]>([]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    // Spawn pieces from bottom-center and edges
    pieces.current = Array.from({ length: 120 }).map(() => {
      const fromCenter = Math.random() > 0.3;
      const x = fromCenter
        ? canvas.width * 0.4 + Math.random() * canvas.width * 0.2
        : Math.random() * canvas.width;
      return {
        x,
        y: fromCenter ? canvas.height * 0.5 : canvas.height + 20,
        vx: (Math.random() - 0.5) * 14,
        vy: fromCenter ? -(8 + Math.random() * 14) : -(4 + Math.random() * 8),
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        size: 6 + Math.random() * 8,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        alpha: 1,
      };
    });

    let elapsed = 0;
    const DURATION = 3000;

    const tick = (dt: number) => {
      elapsed += dt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.current.forEach((p) => {
        p.vy += 0.25;
        p.x  += p.vx;
        p.y  += p.vy;
        p.rot += p.vrot;
        p.alpha = Math.max(0, 1 - elapsed / DURATION);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      });

      if (elapsed < DURATION) {
        let last = performance.now();
        frameRef.current = requestAnimationFrame((now) => { tick(now - last); last = now; });
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
      }
    };

    let last = performance.now();
    frameRef.current = requestAnimationFrame((now) => { tick(now - last); last = now; });

    return () => cancelAnimationFrame(frameRef.current);
  }, [active, onDone]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
