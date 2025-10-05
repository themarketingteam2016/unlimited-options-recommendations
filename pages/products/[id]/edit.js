import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import styles from '../../../styles/ProductEdit.module.css';

export default function ProductEdit() {
  const router = useRouter();
  const { id: encodedId } = router.query;
  const id = encodedId ? decodeURIComponent(encodedId) : null;

  const [product, setProduct] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [variants, setVariants] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState([]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch all attributes
      const attrsRes = await fetch('/api/attributes');
      const attrsData = await attrsRes.json();
      setAttributes(Array.isArray(attrsData) ? attrsData : []);

      // Fetch all products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      setAllProducts(Array.isArray(productsData) ? productsData : []);

      const foundProduct = productsData.find(p => p.id === id);
      setProduct(foundProduct);

      // Fetch existing recommendations
      const recsRes = await fetch(`/api/products/${id}/recommendations`);
      const recsData = await recsRes.json();
      setSelectedRecommendations(
        Array.isArray(recsData) ? recsData.map(r => r.recommended_product.id) : []
      );

      // Fetch variants
      await fetchVariants();

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await fetch(`/api/products/${id}/variants`);
      const data = await res.json();
      setVariants(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching variants:', error);
    }
  };

  const handleAttributeToggle = (attrId) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attrId]: !prev[attrId]
    }));
  };

  const handleValueToggle = (attrId, valueId) => {
    setSelectedValues(prev => ({
      ...prev,
      [attrId]: prev[attrId]?.includes(valueId)
        ? prev[attrId].filter(v => v !== valueId)
        : [...(prev[attrId] || []), valueId]
    }));
  };

  const handleGenerateVariants = async (mode) => {
    try {
      const selectedAttrs = Object.keys(selectedAttributes).filter(k => selectedAttributes[k]);

      if (selectedAttrs.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one attribute' });
        return;
      }

      const res = await fetch(`/api/products/${id}/variants/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          selectedValues: Object.keys(selectedValues).reduce((acc, key) => {
            if (selectedAttributes[key]) {
              acc[key] = selectedValues[key];
            }
            return acc;
          }, {})
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: `Generated ${data.count} variants successfully!` });
        setShowGenerateModal(false);
        await fetchVariants();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate variants' });
    }
  };

  const handleBulkAction = async () => {
    if (selectedVariants.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one variant' });
      return;
    }

    try {
      if (bulkAction === 'delete') {
        const res = await fetch(`/api/products/${id}/variants`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantIds: selectedVariants })
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Variants deleted successfully!' });
          setSelectedVariants([]);
          await fetchVariants();
        }
      } else if (bulkAction === 'price' || bulkAction === 'stock') {
        const updatedVariants = variants
          .filter(v => selectedVariants.includes(v.id))
          .map(v => ({
            ...v,
            ...(bulkAction === 'price' ? { price: parseFloat(bulkValue) } : {}),
            ...(bulkAction === 'stock' ? { stock_quantity: parseInt(bulkValue) } : {})
          }));

        const res = await fetch(`/api/products/${id}/variants`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variants: updatedVariants })
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Variants updated successfully!' });
          await fetchVariants();
        }
      }

      setBulkAction('');
      setBulkValue('');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Bulk action failed' });
    }
  };

  const handleVariantUpdate = async (variantId, field, value) => {
    const updatedVariant = variants.find(v => v.id === variantId);
    if (!updatedVariant) return;

    updatedVariant[field] = value;

    try {
      await fetch(`/api/products/${id}/variants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: [updatedVariant] })
      });
    } catch (error) {
      console.error('Failed to update variant:', error);
    }
  };

  const handleRecommendationToggle = (productId) => {
    setSelectedRecommendations(prev =>
      prev.includes(productId)
        ? prev.filter(p => p !== productId)
        : [...prev, productId].slice(0, 2) // Max 2 recommendations
    );
  };

  const handleSaveRecommendations = async () => {
    try {
      const res = await fetch(`/api/products/${id}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendedProductIds: selectedRecommendations })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Recommendations saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save recommendations' });
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!product) {
    return <div className={styles.loading}>Product not found</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Edit Product - {product.title}</title>
      </Head>

      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <Link href="/" className={styles.backLink}>← Back to Products</Link>
            <h1>{product.title}</h1>
          </div>
        </div>

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        <div className={styles.section}>
          <h2>Select Attributes</h2>
          <div className={styles.attributesGrid}>
            {attributes.map(attr => (
              <div key={attr.id} className={styles.attributeCard}>
                <label className={styles.attributeLabel}>
                  <input
                    type="checkbox"
                    checked={selectedAttributes[attr.id] || false}
                    onChange={() => handleAttributeToggle(attr.id)}
                  />
                  <span>{attr.name}</span>
                  {attr.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                </label>

                {selectedAttributes[attr.id] && (
                  <div className={styles.valuesGrid}>
                    {attr.attribute_values?.map(val => (
                      <label key={val.id} className={styles.valueLabel}>
                        <input
                          type="checkbox"
                          checked={selectedValues[attr.id]?.includes(val.id) || false}
                          onChange={() => handleValueToggle(attr.id, val.id)}
                        />
                        {val.image_url && <img src={val.image_url} alt={val.value} className={styles.valueImg} />}
                        <span>{val.value}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className={styles.btnPrimary}
            onClick={() => setShowGenerateModal(true)}
            disabled={Object.values(selectedAttributes).filter(Boolean).length === 0}
          >
            Save & Generate Variants
          </button>
        </div>

        <div className={styles.section}>
          <h2>Product Recommendations</h2>
          <p className={styles.subtitle}>Select up to 2 products to recommend on the product page</p>
          <div className={styles.recommendationsGrid}>
            {allProducts
              .filter(p => p.id !== id)
              .map(p => (
                <div
                  key={p.id}
                  className={`${styles.recommendationCard} ${
                    selectedRecommendations.includes(p.id) ? styles.selected : ''
                  }`}
                  onClick={() => handleRecommendationToggle(p.id)}
                >
                  {p.featuredImage && (
                    <img src={p.featuredImage.url} alt={p.title} className={styles.recImage} />
                  )}
                  <h4>{p.title}</h4>
                  {selectedRecommendations.includes(p.id) && (
                    <span className={styles.selectedBadge}>✓ Selected</span>
                  )}
                </div>
              ))}
          </div>
          <button className={styles.btnPrimary} onClick={handleSaveRecommendations}>
            Save Recommendations
          </button>
        </div>

        {variants.length > 0 && (
          <div className={styles.section}>
            <div className={styles.variantsHeader}>
              <h2>Variants ({variants.length})</h2>
              <div className={styles.bulkActions}>
                <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                  <option value="">Bulk Actions</option>
                  <option value="price">Update Price</option>
                  <option value="stock">Update Stock</option>
                  <option value="delete">Delete</option>
                </select>
                {(bulkAction === 'price' || bulkAction === 'stock') && (
                  <input
                    type="number"
                    placeholder="Value"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                  />
                )}
                <button
                  className={styles.btnSecondary}
                  onClick={handleBulkAction}
                  disabled={!bulkAction || selectedVariants.length === 0}
                >
                  Apply
                </button>
              </div>
            </div>

            <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedVariants.length === variants.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariants(variants.map(v => v.id));
                        } else {
                          setSelectedVariants([]);
                        }
                      }}
                    />
                  </th>
                  <th>Options</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(variant => (
                  <tr key={variant.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVariants.includes(variant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVariants([...selectedVariants, variant.id]);
                          } else {
                            setSelectedVariants(selectedVariants.filter(id => id !== variant.id));
                          }
                        }}
                      />
                    </td>
                    <td>
                      {variant.variant_options?.map(opt => (
                        <div key={opt.id} className={styles.optionTag}>
                          {opt.attribute_value?.image_url && (
                            <img src={opt.attribute_value.image_url} alt="" className={styles.optionImg} />
                          )}
                          {opt.attribute?.name}: {opt.attribute_value?.value}
                        </div>
                      ))}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={(e) => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                        onBlur={() => fetchVariants()}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price || 0}
                        onChange={(e) => handleVariantUpdate(variant.id, 'price', e.target.value)}
                        onBlur={() => fetchVariants()}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={variant.stock_quantity || 0}
                        onChange={(e) => handleVariantUpdate(variant.id, 'stock_quantity', e.target.value)}
                        onBlur={() => fetchVariants()}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={variant.is_active}
                        onChange={(e) => handleVariantUpdate(variant.id, 'is_active', e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showGenerateModal && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h3>How would you like to proceed?</h3>
              <p>Choose how to generate variants:</p>
              <div className={styles.modalActions}>
                <button
                  className={styles.btnPrimary}
                  onClick={() => handleGenerateVariants('scratch')}
                >
                  Generate from Scratch
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => handleGenerateVariants('modify')}
                >
                  Modify Current Variants
                </button>
                <button
                  className={styles.btnDanger}
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
