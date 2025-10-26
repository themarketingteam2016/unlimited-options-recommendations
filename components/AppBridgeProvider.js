import { useMemo } from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';

/**
 * App Bridge Provider for embedded Shopify apps
 * Wraps the app to enable communication with Shopify admin
 */
export function AppBridgeProvider({ children }) {
  const router = useRouter();

  const config = useMemo(() => {
    const host = router.query.host;

    if (!host) {
      console.warn('[App Bridge] No host parameter found');
      return null;
    }

    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ff7cd44448a97a45216a6a04d47281b0',
      host: host,
      forceRedirect: true,
    };
  }, [router.query.host]);

  // If no config (no host), render children without App Bridge
  if (!config) {
    return <>{children}</>;
  }

  return (
    <Provider config={config}>
      {children}
    </Provider>
  );
}
