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
      const [productsRes, variantsRes, attributesRes] = await Promise.all([
        fetch(`/api/products?shop=${shop}`),
        fetch('/api/variants'),
        fetch('/api/attributes')
      ]);

      const products = await productsRes.json();
      const variants = await variantsRes.json();
      const attributes = await attributesRes.json();

      // Calculate stats
      const totalProducts = Array.isArray(products) ? products.length : 0;
      const totalVariants = Array.isArray(variants) ? variants.length : 0;
      const totalAttributes = Array.isArray(attributes) ? attributes.length : 0;

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
        totalAttributes
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalProducts: 0,
        activeProducts: 0,
        totalVariants: 0,
        activeVariants: 0,
        totalAttributes: 0
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

              {/* Total Variants */}
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  🎯
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Custom Variants</h3>
                  <p className={styles.statValue}>{stats?.totalVariants || 0}</p>
                  <p className={styles.statSubtext}>
                    {stats?.activeVariants || 0} active
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

              {/* Average Variants */}
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  📊
                </div>
                <div className={styles.statContent}>
                  <h3 className={styles.statLabel}>Avg Variants</h3>
                  <p className={styles.statValue}>
                    {stats?.totalProducts > 0
                      ? Math.round(stats.totalVariants / stats.totalProducts)
                      : 0}
                  </p>
                  <p className={styles.statSubtext}>
                    Per product
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
              <div className={styles.actionsGrid}>
                <button
                  className={styles.actionCard}
                  onClick={() => router.push(`/?shop=${shop}${router.query.host ? `&host=${router.query.host}` : ''}`)}
                >
                  <span className={styles.actionIcon}>➕</span>
                  <h3>Add Product Variants</h3>
                  <p>Create custom product options</p>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={() => router.push(`/attributes?shop=${shop}${router.query.host ? `&host=${router.query.host}` : ''}`)}
                >
                  <span className={styles.actionIcon}>🏷️</span>
                  <h3>Manage Attributes</h3>
                  <p>Configure product attributes</p>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={() => router.push(`/admin/sync-variants?shop=${shop}${router.query.host ? `&host=${router.query.host}` : ''}`)}
                >
                  <span className={styles.actionIcon}>🔄</span>
                  <h3>Sync to Shopify</h3>
                  <p>Push variants to your store</p>
                </button>

                <button
                  className={styles.actionCard}
                  onClick={() => router.push(`/admin/recommendations?shop=${shop}${router.query.host ? `&host=${router.query.host}` : ''}`)}
                >
                  <span className={styles.actionIcon}>🔗</span>
                  <h3>Product Recommendations</h3>
                  <p>Set up cross-sells</p>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
