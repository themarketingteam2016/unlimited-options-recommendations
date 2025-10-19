import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Component to handle OAuth authentication in embedded apps
 * Redirects the parent window (top frame) when inside an iframe
 */
export default function ExitIframe() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're inside an iframe
    if (window.top !== window.self) {
      const { shop, host } = router.query;

      if (shop) {
        // Construct the auth page URL (breaks out of iframe first)
        const authUrl = `/auth?shop=${shop}${host ? `&host=${host}` : ''}`;

        // Redirect the parent window (breaks out of iframe)
        window.top.location.href = authUrl;
      }
    }
  }, [router.query]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite'
      }} />
      <p>Redirecting to authentication...</p>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
