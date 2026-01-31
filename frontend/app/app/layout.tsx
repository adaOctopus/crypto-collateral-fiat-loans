// Wagmi/viem load only on /app so landing page stays light
'use client';

import { Providers } from '../providers';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
