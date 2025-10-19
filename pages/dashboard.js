import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Get shop from query params
    const { shop, installed } = router.query;

    if (shop) {
      // Redirect to home page with shop parameter
      router.replace(`/?shop=${shop}${installed ? '&installed=true' : ''}`);
    } else {
      // If no shop parameter, redirect to auth
      router.replace('/api/auth');
    }
  }, [router.query]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading...</p>
    </div>
  );
}
