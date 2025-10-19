import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Auth page for embedded apps
 * This page is loaded outside the iframe and redirects to OAuth
 */
export default function Auth() {
  const router = useRouter();

  useEffect(() => {
    const { shop, host } = router.query;

    if (shop) {
      // Redirect to OAuth initialization
      const authUrl = `/api/auth?shop=${shop}${host ? `&host=${host}` : ''}`;
      window.location.href = authUrl;
    } else {
      // No shop provided, show error
      console.error('No shop parameter provided');
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
      <p>Initializing authentication...</p>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
