import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import styles from '../../styles/ProductEdit.module.css';

export default function ProductEdit() {
  const router = useRouter();
  const { productId } = router.query;

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
  const [productImage, setProductImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

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

      const foundProduct = productsData.find(p => p.id === productId);
      setProduct(foundProduct);

      // Fetch existing recommendations using query params
      const recsRes = await fetch(`/api/recommendations?productId=${encodeURIComponent(productId)}`);
      const recsData = await recsRes.json();
      setSelectedRecommendations(
        Array.isArray(recsData) ? recsData.map(r => r.recommended_product.shopify_product_id) : []
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
      const res = await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`);
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

      console.log('Generating variants with mode:', mode);
      console.log('Selected attributes:', selectedAttributes);
      console.log('Selected values:', selectedValues);

      const res = await fetch(`/api/variants/generate?productId=${encodeURIComponent(productId)}`, {
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

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        setMessage({ type: 'success', text: `Generated ${data.count} variants successfully!` });
        setShowGenerateModal(false);
        await fetchVariants();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: `Failed: ${data.error || 'Unknown error'}` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Generate variants error:', error);
      setMessage({ type: 'error', text: `Failed to generate variants: ${error.message}` });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleBulkAction = async () => {
    if (selectedVariants.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one variant' });
      return;
    }

    try {
      if (bulkAction === 'delete') {
        const res = await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`, {
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

        const res = await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`, {
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
      await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: [updatedVariant] })
      });
    } catch (error) {
      console.error('Failed to update variant:', error);
    }
  };

  const handleRecommendationToggle = (prodId) => {
    setSelectedRecommendations(prev =>
      prev.includes(prodId)
        ? prev.filter(p => p !== prodId)
        : [...prev, prodId].slice(0, 2) // Max 2 recommendations
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setProductImage(base64);

      // Auto-save the image
      setUploadingImage(true);
      try {
        const res = await fetch(`/api/products/update?productId=${encodeURIComponent(productId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: base64 })
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Product image updated successfully!' });
          setTimeout(() => setMessage(null), 3000);
          // Update product state
          setProduct({ ...product, image_url: base64 });
        } else {
          setMessage({ type: 'error', text: 'Failed to update product image' });
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setMessage({ type: 'error', text: 'Failed to upload image' });
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRecommendations = async () => {
    try {
      console.log('Saving recommendations:', selectedRecommendations);
      console.log('Product ID:', productId);

      const res = await fetch(`/api/recommendations?productId=${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendedProductIds: selectedRecommendations })
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        setMessage({ type: 'success', text: 'Recommendations saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: `Failed: ${data.error || 'Unknown error'}` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: `Failed to save recommendations: ${error.message}` });
      setTimeout(() => setMessage(null), 5000);
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

        {/* Product Image */}
        <div className={styles.section}>
          <h2>Product Image</h2>
          <p className={styles.subtitle}>Upload a custom image for this product</p>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {(productImage || product.image_url || product.featuredImage?.url) && (
              <img
                src={productImage || product.image_url || product.featuredImage?.url}
                alt={product.title}
                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
              />
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ marginBottom: '10px' }}
                disabled={uploadingImage}
              />
              {uploadingImage && <p>Uploading image...</p>}
            </div>
          </div>
        </div>

        {/* Attributes Selection */}
        <div className={styles.section}>
          <h2>Select Attributes</h2>
          <p className={styles.subtitle}>Choose which attributes to use for variant generation</p>

          <div className={styles.attributesGrid}>
            {attributes.map(attr => (
              <div key={attr.id} className={styles.attributeCard}>
                <label className={styles.attributeLabel}>
                  <input
                    type="checkbox"
                    checked={selectedAttributes[attr.id] || false}
                    onChange={() => handleAttributeToggle(attr.id)}
                  />
                  {attr.name}
                  {attr.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                </label>

                {selectedAttributes[attr.id] && attr.attribute_values?.length > 0 && (
                  <div className={styles.valuesGrid}>
                    {attr.attribute_values.map(val => (
                      <label key={val.id} className={styles.valueLabel}>
                        <input
                          type="checkbox"
                          checked={selectedValues[attr.id]?.includes(val.id) || false}
                          onChange={() => handleValueToggle(attr.id, val.id)}
                        />
                        {val.image_url && <img src={val.image_url} alt={val.value} className={styles.valueImg} />}
                        {val.value}
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
            disabled={Object.values(selectedAttributes).every(v => !v)}
          >
            Generate Variants
          </button>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className={styles.modal} onClick={() => setShowGenerateModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>Generate Variants</h3>
              <p>Choose how to generate variants:</p>
              <div className={styles.modalActions}>
                <button className={styles.btnSecondary} onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button className={styles.btnPrimary} onClick={() => handleGenerateVariants('modify')}>
                  Add to Existing
                </button>
                <button className={styles.btnDanger} onClick={() => handleGenerateVariants('scratch')}>
                  Replace All (From Scratch)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variants Table */}
        {variants.length > 0 && (
          <div className={styles.section}>
            <div className={styles.variantsHeader}>
              <h2>Variants ({variants.length})</h2>
              <div className={styles.bulkActions}>
                <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                  <option value="">Bulk Actions</option>
                  <option value="price">Set Price</option>
                  <option value="stock">Set Stock</option>
                  <option value="delete">Delete</option>
                </select>
                {(bulkAction === 'price' || bulkAction === 'stock') && (
                  <input
                    type="number"
                    placeholder="Value"
                    value={bulkValue}
                    onChange={e => setBulkValue(e.target.value)}
                  />
                )}
                <button className={styles.btnSecondary} onClick={handleBulkAction}>
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
                      onChange={e => setSelectedVariants(e.target.checked ? variants.map(v => v.id) : [])}
                    />
                  </th>
                  <th>Options</th>
                  <th>Price</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(variant => (
                  <tr key={variant.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedVariants.includes(variant.id)}
                        onChange={e => {
                          setSelectedVariants(prev =>
                            e.target.checked ? [...prev, variant.id] : prev.filter(id => id !== variant.id)
                          );
                        }}
                      />
                    </td>
                    <td>
                      {variant.variant_options?.map(opt => (
                        <div key={opt.id} className={styles.optionTag}>
                          {opt.attribute_value.image_url && (
                            <img src={opt.attribute_value.image_url} alt="" className={styles.optionImg} />
                          )}
                          {opt.attribute.name}: {opt.attribute_value.value}
                        </div>
                      ))}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price || ''}
                        onChange={e => handleVariantUpdate(variant.id, 'price', parseFloat(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={e => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={variant.stock_quantity || 0}
                        onChange={e => handleVariantUpdate(variant.id, 'stock_quantity', parseInt(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={variant.is_active}
                        onChange={e => handleVariantUpdate(variant.id, 'is_active', e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recommendations */}
        <div className={styles.section}>
          <h2>Product Recommendations</h2>
          <p className={styles.subtitle}>Select up to 2 products to recommend with this product</p>

          <div className={styles.recommendationsGrid}>
            {allProducts.filter(p => p.id !== productId).map(prod => (
              <div
                key={prod.id}
                className={`${styles.recommendationCard} ${selectedRecommendations.includes(prod.id) ? styles.selected : ''}`}
                onClick={() => handleRecommendationToggle(prod.id)}
              >
                {prod.featuredImage && (
                  <img src={prod.featuredImage.url} alt={prod.title} className={styles.recImage} />
                )}
                <h4>{prod.title}</h4>
                {selectedRecommendations.includes(prod.id) && (
                  <span className={styles.selectedBadge}>Selected</span>
                )}
              </div>
            ))}
          </div>

          <button className={styles.btnPrimary} onClick={handleSaveRecommendations}>
            Save Recommendations
          </button>
        </div>
      </main>
    </div>
  );
}
