import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';

import { OpenRouterProvider } from '@/providers/openrouter-provider';
import { SessionProvider } from '@/providers/session-provider';
import { SubscriptionProvider } from '@/providers/subscription-provider';

export function AppProviders({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <SubscriptionProvider>
          <OpenRouterProvider>{children}</OpenRouterProvider>
        </SubscriptionProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
