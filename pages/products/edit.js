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
  const [showManualVariantForm, setShowManualVariantForm] = useState(false);
  const [manualVariant, setManualVariant] = useState({});
  const [variantImages, setVariantImages] = useState({});
  const [editingOptions, setEditingOptions] = useState({});
  const [attributeValueImages, setAttributeValueImages] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const fetchData = async () => {
    try {
      // Fetch all attributes
      const attrsRes = await fetch('/api/attributes');
      if (!attrsRes.ok) {
        console.error('Attributes API error:', attrsRes.status, attrsRes.statusText);
        throw new Error(`Failed to fetch attributes: ${attrsRes.status}`);
      }
      const attrsData = await attrsRes.json();
      console.log('=== FETCHED ATTRIBUTES ===');
      console.log('Response status:', attrsRes.status);
      console.log('Data:', attrsData);
      console.log('First attribute:', attrsData[0]);
      console.log('First attribute values:', attrsData[0]?.attribute_values);
      console.log('=========================');

      if (!Array.isArray(attrsData)) {
        console.error('Attributes data is not an array:', attrsData);
      }

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

      // Fetch attribute value images for this product
      const imagesRes = await fetch(`/api/attribute-images?productId=${encodeURIComponent(productId)}`);
      const imagesData = await imagesRes.json();
      if (Array.isArray(imagesData)) {
        const imageMap = {};
        imagesData.forEach(img => {
          imageMap[img.attribute_value_id] = img.image_url;
        });
        setAttributeValueImages(imageMap);
      }

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
      console.log('Fetched variants:', data);
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

  const handleAddManualVariant = async () => {
    try {
      setIsSaving(true);
      const selectedAttrs = Object.keys(selectedAttributes).filter(k => selectedAttributes[k]);

      if (selectedAttrs.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one attribute first' });
        setIsSaving(false);
        return;
      }

      // Check if all attributes have values selected in manual variant
      const missingAttrs = selectedAttrs.filter(attrId => !manualVariant[attrId]);
      if (missingAttrs.length > 0) {
        setMessage({ type: 'error', text: 'Please select a value for all attributes' });
        setIsSaving(false);
        return;
      }

      console.log('Adding manual variant:', manualVariant);

      // Create the variant combination
      const combination = selectedAttrs.map(attrId => {
        const attr = attributes.find(a => a.id === attrId);
        const value = attr.attribute_values.find(v => v.id === manualVariant[attrId]);
        return {
          attribute_id: attrId,
          attribute_value_id: value.id,
          attribute_name: attr.name,
          value: value.value
        };
      });

      const res = await fetch(`/api/variants/create?productId=${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ combination })
      });

      const data = await res.json();
      console.log('Response:', data);

      if (res.ok) {
        setMessage({ type: 'success', text: 'Manual variant created successfully!' });
        setShowManualVariantForm(false);
        setManualVariant({});
        await fetchVariants();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: `Failed: ${data.error || 'Unknown error'}` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Add manual variant error:', error);
      setMessage({ type: 'error', text: `Failed to add variant: ${error.message}` });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateClick = () => {
    const selectedAttrs = Object.keys(selectedAttributes).filter(k => selectedAttributes[k]);

    if (selectedAttrs.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one attribute' });
      return;
    }

    // If no existing variants, generate directly without modal
    if (variants.length === 0) {
      handleGenerateVariants('scratch');
    } else {
      // Show modal to choose mode
      setShowGenerateModal(true);
    }
  };

  const handleGenerateVariants = async (mode) => {
    try {
      setIsGenerating(true);
      const selectedAttrs = Object.keys(selectedAttributes).filter(k => selectedAttributes[k]);

      if (selectedAttrs.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one attribute' });
        setIsGenerating(false);
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
    } finally {
      setIsGenerating(false);
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
      } else if (bulkAction === 'price') {
        const updatedVariants = variants
          .filter(v => selectedVariants.includes(v.id))
          .map(v => ({
            ...v,
            price: parseFloat(bulkValue)
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

  const handleVariantImageUpload = async (variantId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setVariantImages({ ...variantImages, [variantId]: base64 });

      // Auto-save the variant image
      try {
        const updatedVariant = variants.find(v => v.id === variantId);
        await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variants: [{ ...updatedVariant, image_url: base64 }]
          })
        });

        setMessage({ type: 'success', text: 'Variant image updated!' });
        await fetchVariants();
        setTimeout(() => setMessage(null), 2000);
      } catch (error) {
        console.error('Variant image upload error:', error);
        setMessage({ type: 'error', text: 'Failed to upload variant image' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      const res = await fetch(`/api/variants?productId=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantIds: [variantId] })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Variant deleted successfully!' });
        await fetchVariants();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete variant' });
    }
  };

  const handleOptionChange = async (variantId, attributeId, newValueId) => {
    // Update the variant option
    setEditingOptions({ ...editingOptions, [variantId]: { ...editingOptions[variantId], [attributeId]: newValueId } });

    // Save the change
    try {
      const variant = variants.find(v => v.id === variantId);
      const updatedOptions = variant.variant_options.map(opt =>
        opt.attribute_id === attributeId
          ? { ...opt, attribute_value_id: newValueId }
          : opt
      );

      // Create new combination key
      const combination = updatedOptions.map(opt => {
        const attr = attributes.find(a => a.id === opt.attribute_id);
        const value = attr.attribute_values.find(v => v.id === opt.attribute_value_id);
        return `${attr.name}:${value.value}`;
      }).sort().join('|');

      const res = await fetch(`/api/variants/update-options?productId=${encodeURIComponent(productId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          options: updatedOptions,
          combinationKey: combination
        })
      });

      if (res.ok) {
        await fetchVariants();
      }
    } catch (error) {
      console.error('Failed to update variant option:', error);
    }
  };

  const handleAttributeValueImageUpload = async (attributeValueId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setAttributeValueImages({ ...attributeValueImages, [attributeValueId]: base64 });

      // Auto-save the image
      try {
        const res = await fetch(`/api/attribute-images?productId=${encodeURIComponent(productId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attributeValueId,
            imageUrl: base64
          })
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Image uploaded!' });
          setTimeout(() => setMessage(null), 2000);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setMessage({ type: 'error', text: 'Failed to upload image' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveRecommendations = async () => {
    try {
      setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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
            {(productImage || product.image_url || product.featuredImage?.url) ? (
              <img
                src={productImage || product.image_url || product.featuredImage?.url}
                alt={product.title}
                style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e3e5e7' }}
              />
            ) : (
              <div style={{
                width: '200px',
                height: '200px',
                border: '2px dashed #c9cccf',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: '#c9cccf'
              }}>
                📷
              </div>
            )}
            <div>
              <label className={styles.uploadButton} style={{ padding: '10px 20px', fontSize: '14px' }}>
                {(productImage || product.image_url) ? 'Change Product Image' : 'Upload Product Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
              {uploadingImage && <p style={{ marginTop: '10px', fontSize: '14px', color: '#6d7175' }}>Uploading image...</p>}
            </div>
          </div>
        </div>

        {/* Attributes Selection */}
        <div className={styles.section}>
          <h2>Attributes & Values</h2>
          <p className={styles.subtitle}>Select attributes and their values to create product variations</p>

          <div className={styles.attributesGrid}>
            {attributes.map(attr => (
              <div key={attr.id} className={styles.attributeCard}>
                <label className={styles.attributeLabel}>
                  <input
                    type="checkbox"
                    checked={selectedAttributes[attr.id] || false}
                    onChange={() => handleAttributeToggle(attr.id)}
                  />
                  <span style={{ fontSize: '15px' }}>{attr.name}</span>
                  {attr.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                </label>

                {attr.attribute_values?.length > 0 && (
                  <div className={styles.valuesGrid}>
                    {attr.attribute_values.map(val => (
                      <div key={val.id} className={styles.valueItemWithImage}>
                        <div className={styles.valueCheckbox}>
                          <label className={styles.valueLabel}>
                            <input
                              type="checkbox"
                              checked={selectedValues[attr.id]?.includes(val.id) || false}
                              onChange={() => handleValueToggle(attr.id, val.id)}
                            />
                            <span>{val.value}</span>
                          </label>
                        </div>

                        {/* Show image upload only when value is selected */}
                        {selectedValues[attr.id]?.includes(val.id) && (
                          <div className={styles.valueImageSection}>
                            {(attributeValueImages[val.id] || val.image_url) ? (
                              <img
                                src={attributeValueImages[val.id] || val.image_url}
                                alt={val.value}
                                className={styles.valueImgLarge}
                              />
                            ) : (
                              <div className={styles.imagePlaceholder}>
                                <span>📷</span>
                              </div>
                            )}
                            <label className={styles.uploadButtonSmall}>
                              {(attributeValueImages[val.id] || val.image_url) ? 'Change' : 'Upload Image'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAttributeValueImageUpload(val.id, e)}
                                style={{ display: 'none' }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Selected Values Summary */}
          {Object.keys(selectedValues).some(attrId => selectedValues[attrId]?.length > 0) && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#f6faf9',
              border: '1px solid #008060',
              borderRadius: '8px'
            }}>
              <h3 style={{ fontSize: '14px', marginBottom: '10px', color: '#202223' }}>
                Selected for Generation:
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {Object.keys(selectedValues).map(attrId => {
                  if (!selectedValues[attrId] || selectedValues[attrId].length === 0) return null;
                  const attr = attributes.find(a => a.id === attrId);
                  if (!attr) return null;

                  return (
                    <div key={attrId} style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px', color: '#008060' }}>{attr.name}:</strong>
                      {selectedValues[attrId].map(valId => {
                        const val = attr.attribute_values?.find(v => v.id === valId);
                        return val ? (
                          <span
                            key={valId}
                            style={{
                              background: '#008060',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            {val.value}
                          </span>
                        ) : null;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              className={styles.btnPrimary}
              onClick={handleGenerateClick}
              disabled={Object.values(selectedAttributes).every(v => !v) || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Variations from Selected'}
            </button>
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className={styles.modal} onClick={() => setShowGenerateModal(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>Generate Variations</h3>
              <p>This will create all possible combinations of the selected attributes and values.</p>
              <p style={{ fontSize: '13px', color: '#6d7175', marginTop: '10px' }}>
                Choose how to proceed:
              </p>
              <div className={styles.modalActions} style={{ marginTop: '20px' }}>
                <button className={styles.btnSecondary} onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </button>
                <button className={styles.btnPrimary} onClick={() => handleGenerateVariants('modify')}>
                  Add to Existing Variations
                </button>
                <button className={styles.btnDanger} onClick={() => handleGenerateVariants('scratch')}>
                  Replace All Variations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variants Section */}
        {(variants.length > 0 || Object.keys(selectedAttributes).filter(k => selectedAttributes[k]).length > 0) && (
          <div className={styles.section}>
            <div className={styles.variantsHeader}>
              <h2>Product Variations ({variants.length})</h2>
              {variants.length > 0 && (
                <div className={styles.bulkActions}>
                  <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
                    <option value="">Bulk Actions</option>
                    <option value="price">Set Price</option>
                    <option value="delete">Delete</option>
                  </select>
                  {bulkAction === 'price' && (
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
              )}
            </div>

            {variants.length > 0 && (
              <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedVariants.length === variants.length}
                      onChange={e => setSelectedVariants(e.target.checked ? variants.map(v => v.id) : [])}
                    />
                  </th>
                  <th style={{ width: '100px' }}>Image</th>
                  <th>Options</th>
                  <th style={{ width: '100px' }}>Price</th>
                  <th style={{ width: '120px' }}>SKU</th>
                  <th style={{ width: '80px' }}>Action</th>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        {(variantImages[variant.id] || variant.image_url) ? (
                          <img
                            src={variantImages[variant.id] || variant.image_url}
                            alt="Variant"
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e3e5e7' }}
                          />
                        ) : (
                          <div style={{
                            width: '60px',
                            height: '60px',
                            border: '2px dashed #c9cccf',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            color: '#c9cccf'
                          }}>
                            📷
                          </div>
                        )}
                        <label className={styles.uploadButton}>
                          {(variantImages[variant.id] || variant.image_url) ? 'Change' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleVariantImageUpload(variant.id, e)}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </td>
                    <td>
                      {variant.variant_options?.map((opt, idx) => {
                        // Only log first option to avoid spam
                        if (idx === 0 && variant.id === variants[0]?.id) {
                          console.log('=== DROPDOWN DEBUG (first variant) ===');
                          console.log('Total attributes in state:', attributes.length);
                          console.log('Attributes state:', attributes);
                          console.log('Looking for attribute ID:', opt.attribute_id);
                          console.log('Available attribute IDs:', attributes.map(a => a.id));
                        }

                        // Find attribute by converting IDs to strings for comparison
                        const attr = attributes.find(a => String(a.id) === String(opt.attribute_id));

                        if (idx === 0 && variant.id === variants[0]?.id) {
                          console.log('Found attribute:', attr);
                          console.log('Has values?', attr?.attribute_values);
                          console.log('====================================');
                        }

                        // Fallback if attribute or values not found
                        if (!attr || !attr.attribute_values || attr.attribute_values.length === 0) {
                          console.warn('No attribute values found for:', opt.attribute.name);
                          return (
                            <div key={opt.id} style={{ marginBottom: '8px', padding: '6px', background: '#fff3cd', borderRadius: '4px' }}>
                              <strong>{opt.attribute.name}:</strong> {opt.attribute_value.value}
                              <span style={{ fontSize: '11px', color: '#856404', marginLeft: '8px' }}>
                                (values not loaded)
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={opt.id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', minWidth: '60px' }}>
                              {opt.attribute.name}:
                            </label>
                            <select
                              value={editingOptions[variant.id]?.[opt.attribute_id] || opt.attribute_value_id}
                              onChange={(e) => handleOptionChange(variant.id, opt.attribute_id, e.target.value)}
                              style={{
                                fontSize: '13px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #c9cccf',
                                minWidth: '120px'
                              }}
                            >
                              {attr.attribute_values.map(val => (
                                <option key={val.id} value={val.id}>
                                  {val.value}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={variant.price || ''}
                        onChange={e => handleVariantUpdate(variant.id, 'price', parseFloat(e.target.value))}
                        style={{ width: '90px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={variant.sku || ''}
                        onChange={e => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                        style={{ width: '110px' }}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteVariant(variant.id)}
                        className={styles.btnDelete}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}

            {/* Manual Variant Creation - Inside Variants Section */}
            {Object.keys(selectedAttributes).filter(k => selectedAttributes[k]).length > 0 && (
              <div style={{ marginTop: '30px', padding: '20px', background: '#f6f6f7', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#202223' }}>Add Individual Variation</h3>
                <p style={{ fontSize: '13px', color: '#6d7175', marginBottom: '15px' }}>
                  Create a single variation by selecting specific attribute values
                </p>

                <div className={styles.manualVariantForm}>
                  <div className={styles.manualVariantOptions}>
                    {Object.keys(selectedAttributes)
                      .filter(k => selectedAttributes[k])
                      .map(attrId => {
                        const attr = attributes.find(a => a.id === attrId);
                        return (
                          <div key={attrId} className={styles.formGroup}>
                            <label>{attr.name}</label>
                            <select
                              value={manualVariant[attrId] || ''}
                              onChange={(e) => setManualVariant({ ...manualVariant, [attrId]: e.target.value })}
                              className={styles.formSelect}
                            >
                              <option value="">Select {attr.name}...</option>
                              {attr?.attribute_values?.map(val => (
                                <option key={val.id} value={val.id}>
                                  {val.value}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={handleAddManualVariant}
                    className={styles.btnPrimary}
                    style={{ marginTop: '15px' }}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Adding...' : 'Add Variation'}
                  </button>
                </div>
              </div>
            )}
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

          <button
            className={styles.btnPrimary}
            onClick={handleSaveRecommendations}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Recommendations'}
          </button>
        </div>
      </main>
    </div>
  );
}
