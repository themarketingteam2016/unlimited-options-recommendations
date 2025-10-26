import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Home from './index';

/**
 * Auth/Entry page for custom embedded apps
 *
 * This is the entry point when opening the app from Shopify Admin.
 * For custom apps (single store), no OAuth is needed - we just
 * render the main app interface directly within Shopify's iframe.
 */
export default function Auth() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for router to be ready with query params
    if (router.isReady) {
      const { shop, host } = router.query;

      console.log('[Auth] Entry point loaded', { shop, host });

      if (!host) {
        console.warn('[Auth] No host parameter - app may not be properly embedded');
      }

      setIsReady(true);
    }
  }, [router.isReady, router.query]);

  // Show loading while router initializes
  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #008060',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#202223', fontSize: '16px' }}>Loading app...</p>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Render main app inside Shopify iframe
  return <Home />;
}
