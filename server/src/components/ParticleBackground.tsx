import { useEffect, useRef } from 'react';

interface InkSpot {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  angles: number[];
  radii: number[];
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let spots: InkSpot[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createSpots = () => {
      spots = [];
      const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 30000));
      for (let i = 0; i < count; i++) {
        const pointCount = 5 + Math.floor(Math.random() * 4);
        const angles: number[] = [];
        const radii: number[] = [];
        for (let j = 0; j < pointCount; j++) {
          angles.push((j / pointCount) * Math.PI * 2);
          radii.push(0.6 + Math.random() * 0.4);
        }
        spots.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2 + Math.random() * 6,
          opacity: 0.03 + Math.random() * 0.05,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          angles,
          radii,
        });
      }
    };

    const drawSpot = (spot: InkSpot) => {
      ctx.beginPath();
      const cx = spot.x;
      const cy = spot.y;
      const r = spot.size / 2;
      for (let i = 0; i < spot.angles.length; i++) {
        const px = cx + Math.cos(spot.angles[i]) * r * spot.radii[i];
        const py = cy + Math.sin(spot.angles[i]) * r * spot.radii[i];
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(26, 26, 26, ${spot.opacity})`;
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const spot of spots) {
        spot.x += spot.vx;
        spot.y += spot.vy;
        if (spot.x < 0 || spot.x > canvas.width) spot.vx *= -1;
        if (spot.y < 0 || spot.y > canvas.height) spot.vy *= -1;
        drawSpot(spot);
      }
      animationId = requestAnimationFrame(animate);
    };

    resize();
    createSpots();
    animate();

    window.addEventListener('resize', () => {
      resize();
      createSpots();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
