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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingSpinner size="large" text="Loading dashboard..." />
          </div>
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

            {/* Charts Section */}
            <div className={styles.chartsGrid}>
              {/* Products Status Chart */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Products Overview</h3>
                <div className={styles.pieChart}>
                  <div className={styles.pieChartCircle}>
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#e8f5f1"
                        strokeWidth="40"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="url(#gradient1)"
                        strokeWidth="40"
                        strokeDasharray={`${((stats?.activeProducts || 0) / Math.max(stats?.totalProducts || 1, 1)) * 502.4} 502.4`}
                        strokeDashoffset="125.6"
                        transform="rotate(-90 100 100)"
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                      <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#667eea" />
                          <stop offset="100%" stopColor="#764ba2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className={styles.pieChartCenter}>
                      <div className={styles.pieChartValue}>
                        {stats?.totalProducts > 0
                          ? Math.round((stats.activeProducts / stats.totalProducts) * 100)
                          : 0}%
                      </div>
                      <div className={styles.pieChartLabel}>Active</div>
                    </div>
                  </div>
                  <div className={styles.chartLegend}>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></span>
                      <span className={styles.legendText}>Active: {stats?.activeProducts || 0}</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span className={styles.legendColor} style={{ background: '#e8f5f1' }}></span>
                      <span className={styles.legendText}>Inactive: {(stats?.totalProducts || 0) - (stats?.activeProducts || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>System Activity</h3>
                <div className={styles.activityBars}>
                  <div className={styles.activityItem}>
                    <div className={styles.activityLabel}>
                      <span>Orders</span>
                      <span className={styles.activityValue}>{stats?.totalOrders || 0}</span>
                    </div>
                    <div className={styles.activityBar}>
                      <div
                        className={styles.activityProgress}
                        style={{
                          width: `${Math.min((stats?.totalOrders || 0) / 100 * 100, 100)}%`,
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className={styles.activityItem}>
                    <div className={styles.activityLabel}>
                      <span>Products</span>
                      <span className={styles.activityValue}>{stats?.totalProducts || 0}</span>
                    </div>
                    <div className={styles.activityBar}>
                      <div
                        className={styles.activityProgress}
                        style={{
                          width: `${Math.min((stats?.totalProducts || 0) / 50 * 100, 100)}%`,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className={styles.activityItem}>
                    <div className={styles.activityLabel}>
                      <span>Attributes</span>
                      <span className={styles.activityValue}>{stats?.totalAttributes || 0}</span>
                    </div>
                    <div className={styles.activityBar}>
                      <div
                        className={styles.activityProgress}
                        style={{
                          width: `${Math.min((stats?.totalAttributes || 0) / 20 * 100, 100)}%`,
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
