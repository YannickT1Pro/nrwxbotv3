c:\Users\Janick\Desktop\nrwbotv3\nrwxbotv3\apps\dashboard\src\app\providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}