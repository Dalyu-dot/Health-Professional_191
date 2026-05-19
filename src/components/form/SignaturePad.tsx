import { Eraser, Save } from 'lucide-react';
import { PointerEvent, useEffect, useRef, useState } from 'react';

export function SignaturePad({ value, onChange }: { value: string | null; onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
      if (value) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = value;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [value]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = event.currentTarget.getContext('2d');
    const p = point(event);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
    setDrawing(true);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = event.currentTarget.getContext('2d');
    const p = point(event);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-md border border-slate-300 bg-white dark:border-slate-700"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => setDrawing(false)}
        onPointerCancel={() => setDrawing(false)}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-md bg-phil-600 px-3 py-2 text-sm font-medium text-white">
          <Save size={16} /> Save signature
        </button>
        <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Eraser size={16} /> Clear
        </button>
      </div>
      {value && <img src={value} alt="Saved signature preview" className="h-20 rounded-md border border-slate-200 bg-white object-contain p-2" />}
    </div>
  );
}
