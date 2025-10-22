import { useState } from 'react';

export default function SyncVariants() {
  const [productId, setProductId] = useState('gid://shopify/Product/9114913341692');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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

      <button
        onClick={handleSync}
        disabled={syncing || !productId}
        style={{
          marginTop: '16px',
          padding: '12px 24px',
          background: syncing ? '#ccc' : '#008060',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: syncing ? 'not-allowed' : 'pointer'
        }}
      >
        {syncing ? 'Syncing...' : 'Sync Variants'}
      </button>

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
          <li>Enter the Shopify Product GID (e.g., gid://shopify/Product/9114913341692)</li>
          <li>Click "Sync Variants"</li>
          <li>Wait for the sync to complete</li>
          <li>All variants without a Shopify variant ID will be created in Shopify with correct prices</li>
        </ol>

        <h4 style={{ marginTop: '24px' }}>Common Product IDs:</h4>
        <ul>
          <li>
            <button
              onClick={() => setProductId('gid://shopify/Product/9114913341692')}
              style={{
                background: 'none',
                border: 'none',
                color: '#008060',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              3 Stone Rings - gid://shopify/Product/9114913341692
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
