import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const router = useRouter();

  const isActive = (path) => {
    if (path === '/') {
      // Products page can be accessed via /, /auth, or /products/*
      return router.pathname === '/' ||
             router.pathname === '/auth' ||
             router.pathname.startsWith('/products');
    }
    return router.pathname.startsWith(path);
  };

  // Get current query params (shop, host) to preserve them in navigation
  const { shop, host } = router.query;

  // Build URL with query params
  const buildUrl = (path) => {
    const params = new URLSearchParams();
    if (shop) params.append('shop', shop);
    if (host) params.append('host', host);
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  };

  return (
    <div className={styles.sidebar}>
      <h2>Menu</h2>
      <nav>
        <Link
          href={buildUrl('/')}
          className={`${styles.navLink} ${isActive('/') && !isActive('/attributes') ? styles.active : ''}`}
        >
          <span>Products</span>
        </Link>
        <Link
          href={buildUrl('/attributes')}
          className={`${styles.navLink} ${isActive('/attributes') ? styles.active : ''}`}
        >
          <span>Attributes</span>
        </Link>
      </nav>
    </div>
  );
}
