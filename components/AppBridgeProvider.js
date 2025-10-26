import { useMemo, useEffect, useState } from 'react';
import { Provider } from '@shopify/app-bridge-react';
import { useRouter } from 'next/router';

/**
 * App Bridge Provider for embedded Shopify apps
 * Wraps the app to enable communication with Shopify admin
 */
export function AppBridgeProvider({ children }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for router to be ready
    if (router.isReady) {
      setIsReady(true);
    }
  }, [router.isReady]);

  const config = useMemo(() => {
    if (!isReady) {
      return null;
    }

    const host = router.query.host;

    if (!host) {
      console.warn('[App Bridge] No host parameter found');
      return null;
    }

    console.log('[App Bridge] Initializing with host:', host);

    return {
      apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ff7cd44448a97a45216a6a04d47281b0',
      host: host,
      forceRedirect: true,
    };
  }, [isReady, router.query.host]);

  // Show loading while waiting for router
  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #008060',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If no config (no host), render children without App Bridge
  if (!config) {
    console.log('[App Bridge] No host parameter, rendering without App Bridge');
    return <>{children}</>;
  }

  return (
    <Provider config={config}>
      {children}
    </Provider>
  );
}
