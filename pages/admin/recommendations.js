import { useState, useEffect } from 'react';
import { supabaseAdmin } from '../../lib/supabase';
import { fetchShopifyProductsREST } from '../../lib/shopify-client';

export default function RecommendationsPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadRecommendations(selectedProduct);
    }
  }, [selectedProduct]);

  async function loadProducts() {
    try {
      setLoading(true);
      const shopifyProducts = await fetchShopifyProductsREST();
      setProducts(shopifyProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage('Error loading products');
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations(productGid) {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productGid)}/recommendations`);
      const data = await res.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  }

  async function addRecommendation(e) {
    e.preventDefault();

    if (!selectedProduct || !selectedRecommendation) {
      setMessage('Please select both product and recommendation');
      return;
    }

    if (selectedProduct === selectedRecommendation) {
      setMessage('Cannot recommend the same product');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/recommendations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct,
          recommendedProductId: selectedRecommendation,
          displayOrder: recommendations.length
        })
      });

      if (res.ok) {
        setMessage('Recommendation added successfully!');
        setSelectedRecommendation('');
        loadRecommendations(selectedProduct);
      } else {
        const error = await res.json();
        setMessage(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding recommendation:', error);
      setMessage('Error adding recommendation');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecommendation(recId) {
    if (!confirm('Delete this recommendation?')) return;

    try {
      // Add delete endpoint later
      setMessage('Delete functionality coming soon');
    } catch (error) {
      console.error('Error deleting:', error);
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '32px' }}>
        Product Recommendations
      </h1>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '24px',
          borderRadius: '8px',
          background: message.includes('Error') ? '#fee' : '#efe',
          color: message.includes('Error') ? '#c00' : '#060',
          border: `1px solid ${message.includes('Error') ? '#fcc' : '#cfc'}`
        }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <form onSubmit={addRecommendation}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value="">Choose a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>
                  Add Recommendation
                </label>
                <select
                  value={selectedRecommendation}
                  onChange={(e) => setSelectedRecommendation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Choose a product to recommend...</option>
                  {products
                    .filter(p => p.id !== selectedProduct)
                    .filter(p => !recommendations.find(r => r.recommended_product?.shopify_product_id === p.id))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedRecommendation}
                style={{
                  padding: '12px 24px',
                  background: '#008060',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                {loading ? 'Adding...' : 'Add Recommendation'}
              </button>
            </>
          )}
        </form>
      </div>

      {selectedProduct && recommendations.length > 0 && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Current Recommendations
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {recommendations.map((rec, idx) => (
              <div
                key={rec.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {rec.recommended_product?.image_url && (
                    <img
                      src={rec.recommended_product.image_url}
                      alt={rec.recommended_product.title}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {rec.recommended_product?.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Display Order: {idx + 1}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteRecommendation(rec.id)}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedProduct && recommendations.length === 0 && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
          border: '2px dashed #ddd',
          borderRadius: '8px'
        }}>
          No recommendations yet. Add some above!
        </div>
      )}
    </div>
  );
}
