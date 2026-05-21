import { Camera, Upload, X, ZoomIn } from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

export function PhotoUpload({ value, onChange }: { value: string | null; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

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
    event.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex aspect-[7/9] w-40 items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
        {value
          ? <img src={value} alt="Passport preview" className="h-full w-full object-cover" />
          : <span className="px-4 text-center text-xs text-slate-500">Passport photo</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-phil-600 px-3 py-2 text-sm font-medium text-white">
          <Upload size={16} /> Upload
        </button>
        <button type="button" onClick={() => setCameraOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <Camera size={16} /> Camera
        </button>
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={handleFile} hidden />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {cameraOpen && (
        <CameraModal
          onCapture={(dataUrl) => { onChange(dataUrl); setCameraOpen(false); }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}

// ── Camera modal ──────────────────────────────────────────────────────────────

function CameraModal({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError('Camera access denied or not available.'));

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;

    // Crop to 7:9 passport ratio from center of video frame
    const targetW = 700;
    const targetH = 900;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sourceRatio = vw / vh;
    const targetRatio = targetW / targetH;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (sourceRatio > targetRatio) { sw = vh * targetRatio; sx = (vw - sw) / 2; }
    else { sh = vw / targetRatio; sy = (vh - sh) / 2; }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext('2d')?.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    setPreview(canvas.toDataURL('image/jpeg', 0.92));
  };

  const retake = () => setPreview(null);

  const confirm = () => {
    if (preview) onCapture(preview);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 sm:p-4">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="font-medium">Take Passport Photo</span>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {error ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">{error}</p>
          ) : preview ? (
            /* Preview captured photo */
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                <img src={preview} alt="Captured" className="w-full object-cover" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={retake}
                  className="min-h-11 flex-1 rounded-md border border-slate-300 py-2 text-sm font-medium dark:border-slate-700">
                  Retake
                </button>
                <button type="button" onClick={confirm}
                  className="min-h-11 flex-1 rounded-md bg-phil-600 py-2 text-sm font-semibold text-white">
                  Use Photo
                </button>
              </div>
            </div>
          ) : (
            /* Live viewfinder */
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-md bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                {/* Passport crop guide overlay */}
                {ready && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white/70 rounded" style={{ width: '45%', aspectRatio: '7/9' }}>
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white/80 flex items-center gap-1">
                        <ZoomIn size={12} /> Align face within box
                      </div>
                    </div>
                  </div>
                )}
                {!ready && !error && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Starting camera...
                  </div>
                )}
              </div>
              <button type="button" onClick={capture} disabled={!ready}
                className="min-h-11 w-full rounded-md bg-phil-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                Capture
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function cropPassport(file: File): Promise<string> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url; });

  const targetW = 700, targetH = 900;
  const sourceRatio = img.width / img.height;
  const targetRatio = targetW / targetH;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (sourceRatio > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
  else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  canvas.getContext('2d')?.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  URL.revokeObjectURL(url);
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
}
