import { Camera, Upload } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';

export function PhotoUpload({ value, onChange }: { value: string | null; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG photos are accepted.');
      return;
    }
    const dataUrl = await cropPassport(file);
    onChange(dataUrl);
    setError('');
  };

  return (
    <div className="space-y-3">
      <div className="flex aspect-[7/9] w-40 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
        {value ? <img src={value} alt="Passport preview" className="h-full w-full object-cover" /> : <span className="px-4 text-center text-xs text-slate-500">Passport photo</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md bg-phil-600 px-3 py-2 text-sm font-medium text-white">
          <Upload size={16} /> Upload
        </button>
        <button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Camera size={16} /> Camera
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={handleFile} hidden />
      <input ref={cameraRef} type="file" accept="image/png,image/jpeg" capture="user" onChange={handleFile} hidden />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

async function cropPassport(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const targetW = 700;
  const targetH = 900;
  const sourceRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  canvas.getContext('2d')?.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  URL.revokeObjectURL(url);
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
}
