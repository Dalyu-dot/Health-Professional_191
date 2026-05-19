# PhilHealth PDR Frontend-Only Review Build

This folder contains the frontend-only version of the PhilHealth Provider Data Record app for UI/PDF approval.

## What is included

- React + TypeScript + Vite
- TailwindCSS styling
- PWA support
- Browser-only local record storage with `localStorage`
- Passport photo upload/capture
- Signature canvas
- Official PhilHealth PDF template export
- Print/download PDF flow

## What is intentionally not included

- Supabase Authentication
- Supabase database CRUD
- Supabase Storage
- RLS policies or SQL migrations
- Backend service files

## Run

```powershell
cd C:\Users\monty\Downloads\HI191-frontend-only
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

No `.env` file is required for this frontend-only version.
