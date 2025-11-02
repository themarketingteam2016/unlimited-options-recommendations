import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    if (router.isReady) {
      const shopParam = router.query.shop;
      if (shopParam) {
        setShop(shopParam);
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (shop) {
      fetchStats();
    }
  }, [shop]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [productsRes, variantsRes, attributesRes, ordersRes] = await Promise.all([
        fetch(`/api/products?shop=${shop}`),
        fetch('/api/variants'),
        fetch('/api/attributes'),
        fetch('/api/orders/count')
      ]);

      const products = await productsRes.json();
      const variants = await variantsRes.json();
      const attributes = await attributesRes.json();
      const orders = await ordersRes.json();

      // Calculate stats
      const totalProducts = Array.isArray(products) ? products.length : 0;
      const totalVariants = Array.isArray(variants) ? variants.length : 0;
      const totalAttributes = Array.isArray(attributes) ? attributes.length : 0;
      const totalOrders = orders.count || 0;

      // Count active products
      const activeProducts = Array.isArray(products)
        ? products.filter(p => p.status === 'ACTIVE').length
        : 0;

      // Count active variants
      const activeVariants = Array.isArray(variants)
        ? variants.filter(v => v.is_active).length
        : 0;

      setStats({
        totalProducts,
        activeProducts,
        totalVariants,
        activeVariants,
        totalAttributes,
        totalOrders
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalProducts: 0,
        activeProducts: 0,
        totalVariants: 0,
        activeVariants: 0,
        totalAttributes: 0,
        totalOrders: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (!shop && router.isReady) {
    return (
      <div className={styles.loading}>
        <p>Missing shop parameter. Please access through Shopify Admin.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Dashboard - Unlimited Product Options</title>
      </Head>

      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.description}>Overview of your product customization system</p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner size="large" text="Loading dashboard..." />
        ) : (
          <>
            <div className={styles.statsGrid}>
              {/* Total Orders */}
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  🛒
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Total Orders</h3>
                  <p className={styles.statValue}>{stats?.totalOrders || 0}</p>
                  <p className={styles.statSubtext}>
                    All time
                  </p>
                </div>
              </div>

              {/* Total Products */}
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  📦
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Total Products</h3>
                  <p className={styles.statValue}>{stats?.totalProducts || 0}</p>
                  <p className={styles.statSubtext}>
                    {stats?.activeProducts || 0} active
                  </p>
                </div>
              </div>

              {/* Total Attributes */}
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  🏷️
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Attributes</h3>
                  <p className={styles.statValue}>{stats?.totalAttributes || 0}</p>
                  <p className={styles.statSubtext}>
                    Product options
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
