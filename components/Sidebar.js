import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const router = useRouter();

  const isActive = (path) => {
    if (path === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className={styles.sidebar}>
      <h2>Menu</h2>
      <nav>
        <Link
          href="/"
          className={`${styles.navLink} ${isActive('/') && !isActive('/products') && !isActive('/attributes') ? styles.active : ''}`}
        >
          Products
        </Link>
        <Link
          href="/attributes"
          className={`${styles.navLink} ${isActive('/attributes') ? styles.active : ''}`}
        >
          Attributes
        </Link>
      </nav>
    </div>
  );
}
