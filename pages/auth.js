import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

/**
 * Auth page for custom apps (single store)
 * No OAuth needed - uses App Bridge to redirect within Shopify admin
 */
export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    const { shop, host } = router.query;

    if (!shop) {
      console.error('[Auth] No shop parameter provided');
      return;
    }

    // Wait for App Bridge to load, then redirect
    const initAppBridge = () => {
      if (typeof window !== 'undefined' && window.shopify && host) {
        try {
          console.log('[Auth] Initializing App Bridge redirect');

          // Create App Bridge instance
          const AppBridge = window.shopify.AppBridge;
          const app = AppBridge.createApp({
            apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || 'ff7cd44448a97a45216a6a04d47281b0',
            host: host,
          });

          // Use App Bridge Redirect to navigate within embedded context
          const Redirect = window.shopify.AppBridge.actions.Redirect;
          const redirect = Redirect.create(app);

          // Redirect to main app page
          redirect.dispatch(Redirect.Action.APP, `/?shop=${shop}&host=${host}`);
        } catch (error) {
          console.error('[Auth] App Bridge error:', error);
          // Fallback to direct navigation
          window.location.href = `/?shop=${shop}&host=${host}`;
        }
      } else if (shop) {
        // No App Bridge or host - use regular redirect
        console.log('[Auth] Using regular redirect (no App Bridge)');
        window.location.href = `/?shop=${shop}`;
      }
    };

    // Try to initialize immediately if App Bridge is already loaded
    if (window.shopify) {
      initAppBridge();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if (window.shopify) {
          clearInterval(checkInterval);
          initAppBridge();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.shopify && shop) {
          console.log('[Auth] App Bridge timeout - using fallback redirect');
          window.location.href = `/?shop=${shop}`;
        }
      }, 5000);
    }
  }, [router.query]);

  return (
    <>
      <Script
        src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        strategy="beforeInteractive"
      />

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #008060',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#202223', fontSize: '16px' }}>Loading app...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
