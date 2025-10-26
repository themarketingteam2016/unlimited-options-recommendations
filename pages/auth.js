import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Auth page for custom apps (single store)
 * No OAuth needed - just redirects to the main app
 */
export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    const { shop, host } = router.query;

    if (shop && host) {
      // For embedded apps, redirect to main app page
      const redirectUrl = `/?shop=${shop}&host=${host}`;
      console.log('[Auth] Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    } else if (shop) {
      // Fallback without host parameter
      const redirectUrl = `/?shop=${shop}`;
      console.log('[Auth] Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    } else {
      console.error('[Auth] No shop parameter provided');
    }
  }, [router.query, router]);

  return (
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
  );
}
