# 🌐 Smart Attendance System — Web Application

The frontend and API layer of the **Smart Attendance System**, built with **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS**, integrating with **Supabase** for persistence and the **Web Serial API** for direct hardware communication.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SERIAL_ADAPTER=real    # or "mock" for simulated scanning
NEXT_PUBLIC_SERIAL_BAUD_RATE=115200
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.

---

## 🧪 Testing & Verification

Run the 49-test suite verifying the window scheduler, color resolver, and serial verification:
```bash
npm test
```

Type check:
```bash
npx tsc --noEmit
```

Production build:
```bash
npm run build
```
