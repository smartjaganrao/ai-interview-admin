'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cached data never goes stale on its own — the only real API calls
            // are the first-ever load (no cache yet) or an explicit refetch()
            // (the page's Refresh button). No time-based background refetching.
            staleTime: Infinity,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
