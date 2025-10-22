import { useState } from 'react';

// List of main products
const MAIN_PRODUCTS = [
  { id: 'gid://shopify/Product/9114913341692', name: '3 Stone Rings' },
  { id: 'gid://shopify/Product/9115330085116', name: 'Earrings' },
  { id: 'gid://shopify/Product/9115333853436', name: 'Pendant' },
  // Add other 2 products here if you have their IDs
];

export default function SyncVariants() {
  const [productId, setProductId] = useState('gid://shopify/Product/9114913341692');
  const [syncing, setSyncing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [forceSyncing, setForceSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [allResults, setAllResults] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/sync-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to sync variants');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setAllResults(null);
    setError(null);

    const results = [];

    for (const product of MAIN_PRODUCTS) {
      try {
        const response = await fetch('/api/sync-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id })
        });

        const data = await response.json();

        results.push({
          productName: product.name,
          productId: product.id,
          success: response.ok,
          data: data
        });
      } catch (err) {
        results.push({
          productName: product.name,
          productId: product.id,
          success: false,
          error: err.message
        });
      }
    }

    setAllResults(results);
    setSyncingAll(false);
  };

  const handleForceSync = async () => {
    if (!confirm('⚠️ WARNING: This will clear all existing Shopify variant IDs and recreate ALL variants. This operation cannot be undone. Continue?')) {
      return;
    }

    setForceSyncing(true);
    setAllResults(null);
    setError(null);

    const results = [];

    for (const product of MAIN_PRODUCTS) {
      try {
        const response = await fetch('/api/force-resync-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id })
        });

        const data = await response.json();

        results.push({
          productName: product.name,
          productId: product.id,
          success: response.ok,
          data: data
        });
      } catch (err) {
        results.push({
          productName: product.name,
          productId: product.id,
          success: false,
          error: err.message
        });
      }
    }

    setAllResults(results);
    setForceSyncing(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sync Variants to Shopify</h1>
      <p>This will sync all custom variants from the database to Shopify.</p>

      <div style={{ marginTop: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
          Product ID (GID):
        </label>
        <input
          type="text"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="gid://shopify/Product/9114913341692"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={handleSync}
          disabled={syncing || syncingAll || forceSyncing || !productId}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: syncing ? '#ccc' : '#008060',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: (syncing || syncingAll || forceSyncing) ? 'not-allowed' : 'pointer'
          }}
        >
          {syncing ? 'Syncing...' : 'Sync This Product'}
        </button>

        <button
          onClick={handleSyncAll}
          disabled={syncing || syncingAll || forceSyncing}
          style={{
            flex: 1,
            padding: '12px 24px',
            background: syncingAll ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: (syncing || syncingAll || forceSyncing) ? 'not-allowed' : 'pointer'
          }}
        >
          {syncingAll ? 'Syncing All...' : `Sync All ${MAIN_PRODUCTS.length} Products`}
        </button>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: '#fff3cd', border: '2px solid #ff9800', borderRadius: '4px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#ff6f00' }}>⚠️ Force Re-sync (Advanced)</h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>
          Use this if variants show as synced but prices don't match. This will:
        </p>
        <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', fontSize: '14px', color: '#333' }}>
          <li>Clear all existing Shopify variant IDs from database</li>
          <li>Recreate ALL variants in Shopify with correct prices</li>
          <li>This operation cannot be undone</li>
        </ul>
        <button
          onClick={handleForceSync}
          disabled={syncing || syncingAll || forceSyncing}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: forceSyncing ? '#ccc' : '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: (syncing || syncingAll || forceSyncing) ? 'not-allowed' : 'pointer'
          }}
        >
          {forceSyncing ? 'Force Re-syncing All Products...' : '⚠️ Force Re-sync All Variants'}
        </button>
      </div>

      {result && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#e8f5f1',
          border: '1px solid #008060',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#008060' }}>✓ Sync Completed</h3>
          <p><strong>Total variants:</strong> {result.total}</p>
          <p><strong>Successfully synced:</strong> {result.synced}</p>
          <p><strong>Failed:</strong> {result.failed}</p>

          {result.results && result.results.length > 0 && (
            <details style={{ marginTop: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View Details</summary>
              <pre style={{
                marginTop: '8px',
                padding: '12px',
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(result.results, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {allResults && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f6f6f7',
          border: '1px solid #008060',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#008060' }}>Bulk Sync Results</h3>
          {allResults.map((result, index) => (
            <div key={index} style={{
              marginBottom: '12px',
              padding: '12px',
              background: result.success ? '#e8f5f1' : '#ffebee',
              border: `1px solid ${result.success ? '#008060' : '#dc3545'}`,
              borderRadius: '4px'
            }}>
              <h4 style={{ margin: '0 0 8px 0' }}>
                {result.success ? '✓' : '✗'} {result.productName}
              </h4>
              {result.success ? (
                <div>
                  <p style={{ margin: '4px 0' }}>
                    <strong>Synced:</strong> {result.data.synced || 0} variants
                  </p>
                  {result.data.failed > 0 && (
                    <p style={{ margin: '4px 0', color: '#dc3545' }}>
                      <strong>Failed:</strong> {result.data.failed}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ margin: '4px 0', color: '#dc3545' }}>
                  Error: {result.error || result.data?.error || 'Unknown error'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#ffebee',
          border: '1px solid #dc3545',
          borderRadius: '4px',
          color: '#dc3545'
        }}>
          <h3 style={{ margin: '0 0 8px 0' }}>✗ Error</h3>
          <p>{error}</p>
        </div>
      )}

      <div style={{
        marginTop: '40px',
        padding: '16px',
        background: '#f6f6f7',
        borderRadius: '4px'
      }}>
        <h3>Instructions:</h3>
        <ol>
          <li><strong>Sync All Products:</strong> Click the red "Sync All 3 Products" button to sync all main products at once</li>
          <li><strong>Or Sync One Product:</strong>
            <ul style={{ marginTop: '8px' }}>
              <li>Enter the Shopify Product GID</li>
              <li>Click "Sync This Product"</li>
              <li>Wait for the sync to complete</li>
            </ul>
          </li>
          <li>All variants without a Shopify variant ID will be created in Shopify with correct prices</li>
        </ol>

        <h4 style={{ marginTop: '24px' }}>Main Products ({MAIN_PRODUCTS.length}):</h4>
        <ul>
          {MAIN_PRODUCTS.map((product, index) => (
            <li key={index} style={{ marginBottom: '8px' }}>
              <button
                onClick={() => setProductId(product.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#008060',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px'
                }}
              >
                {product.name} - {product.id}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
