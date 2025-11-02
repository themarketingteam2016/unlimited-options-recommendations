import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import LoadingSpinner from '../../components/LoadingSpinner';
import styles from '../../styles/ProductEdit.module.css';

export default function ProductEdit() {
  const router = useRouter();
  const { productId } = router.query;

  const [product, setProduct] = useState(null);
  const [isRing, setIsRing] = useState(false);
  const [ringSizes, setRingSizes] = useState([]);
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
  const [activeTab, setActiveTab] = useState('attributes');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialState, setInitialState] = useState(null);

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  // Debug: Log when selectedAttributes or selectedValues change
  useEffect(() => {
    console.log('selectedAttributes state changed:', selectedAttributes);
  }, [selectedAttributes]);

  useEffect(() => {
    console.log('selectedValues state changed:', selectedValues);
  }, [selectedValues]);

  // Track changes and warn user on navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Set initial state after loading completes
  useEffect(() => {
    if (!loading && !initialState && product) {
      setInitialState({
        variants: JSON.stringify(variants),
        selectedAttributes: JSON.stringify(selectedAttributes),
        selectedValues: JSON.stringify(selectedValues),
        selectedRecommendations: JSON.stringify(selectedRecommendations),
        isRing: isRing,
        ringSizes: JSON.stringify(ringSizes)
      });
    }
  }, [loading, product]);

  // Detect changes in variants, selectedAttributes, selectedValues, or recommendations
  useEffect(() => {
    if (!initialState) return;

    const currentState = {
      variants: JSON.stringify(variants),
      selectedAttributes: JSON.stringify(selectedAttributes),
      selectedValues: JSON.stringify(selectedValues),
      selectedRecommendations: JSON.stringify(selectedRecommendations),
      isRing: isRing,
      ringSizes: JSON.stringify(ringSizes)
    };

    const hasChanges =
      currentState.variants !== initialState.variants ||
      currentState.selectedAttributes !== initialState.selectedAttributes ||
      currentState.selectedValues !== initialState.selectedValues ||
      currentState.selectedRecommendations !== initialState.selectedRecommendations ||
      currentState.isRing !== initialState.isRing ||
      currentState.ringSizes !== initialState.ringSizes;

    setHasUnsavedChanges(hasChanges);
  }, [variants, selectedAttributes, selectedValues, selectedRecommendations, isRing, ringSizes, initialState]);

  // Helper function to reset unsaved changes after successful save
  const resetUnsavedChanges = () => {
    setInitialState({
      variants: JSON.stringify(variants),
      selectedAttributes: JSON.stringify(selectedAttributes),
      selectedValues: JSON.stringify(selectedValues),
      selectedRecommendations: JSON.stringify(selectedRecommendations),
      isRing: isRing,
      ringSizes: JSON.stringify(ringSizes)
    });
    setHasUnsavedChanges(false);
  };

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
      console.log('First attribute ID type:', typeof attrsData[0]?.id, attrsData[0]?.id);
      console.log('First attribute values:', attrsData[0]?.attribute_values);
      if (attrsData[0]?.attribute_values?.[0]) {
        console.log('First value ID type:', typeof attrsData[0].attribute_values[0].id, attrsData[0].attribute_values[0].id);
      }
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
      setIsRing(foundProduct?.is_ring || false);

      // Set ring sizes from database or use defaults
      const defaultRingSizes = [4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12];
      setRingSizes(foundProduct?.ring_sizes || defaultRingSizes);

      // Fetch existing recommendations using query params
      const recsRes = await fetch(`/api/recommendations?productId=${encodeURIComponent(productId)}`);
      const recsData = await recsRes.json();
      // Store internal product IDs (not shopify_product_id) since that's what we compare in the UI
      setSelectedRecommendations(
        Array.isArray(recsData) ? recsData.map(r => r.recommended_product.id) : []
      );

      // Fetch variants
      const variantsData = await fetchVariants();

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

      // Restore previously selected attributes and values from existing variants
      if (variantsData && variantsData.length > 0) {
        const usedAttributeIds = new Set();
        const usedValuesByAttribute = {};

        console.log('=== RESTORING SELECTIONS ===');
        console.log('Number of variants:', variantsData.length);
        console.log('First variant:', variantsData[0]);
        console.log('First variant options:', variantsData[0]?.variant_options);

        variantsData.forEach(variant => {
          if (!variant.variant_options || variant.variant_options.length === 0) {
            console.warn('Variant has no options:', variant);
            return;
          }

          variant.variant_options.forEach(opt => {
            console.log('Processing option:', {
              attribute_id: opt.attribute_id,
              attribute_id_type: typeof opt.attribute_id,
              attribute_value_id: opt.attribute_value_id,
              attribute_value_id_type: typeof opt.attribute_value_id
            });

            // Ensure IDs are strings for consistent comparison
            const attrId = String(opt.attribute_id);
            const valueId = String(opt.attribute_value_id);

            usedAttributeIds.add(attrId);

            if (!usedValuesByAttribute[attrId]) {
              usedValuesByAttribute[attrId] = new Set();
            }
            usedValuesByAttribute[attrId].add(valueId);
          });
        });

        console.log('Used attribute IDs:', Array.from(usedAttributeIds));
        console.log('Used values by attribute:', usedValuesByAttribute);

        // Set selected attributes
        const selectedAttrs = {};
        usedAttributeIds.forEach(attrId => {
          selectedAttrs[attrId] = true;
        });

        console.log('Setting selected attributes:', selectedAttrs);
        setSelectedAttributes(selectedAttrs);

        // Set selected values
        const selectedVals = {};
        Object.keys(usedValuesByAttribute).forEach(attrId => {
          selectedVals[attrId] = Array.from(usedValuesByAttribute[attrId]);
        });

        console.log('Setting selected values:', selectedVals);
        setSelectedValues(selectedVals);

        console.log('Current state after setting:');
        console.log('selectedAttributes:', selectedAttrs);
        console.log('selectedValues:', selectedVals);
        console.log('=========================');
      } else {
        console.log('No variants found for restoration');
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
      const variantsArray = Array.isArray(data) ? data : [];
      setVariants(variantsArray);
      return variantsArray;
    } catch (error) {
      console.error('Error fetching variants:', error);
      return [];
    }
  };

  const handleAttributeToggle = (attrId) => {
    // Ensure consistent string comparison
    const attrIdStr = String(attrId);
    const isCurrentlySelected = selectedAttributes[attrIdStr];

    setSelectedAttributes(prev => ({
      ...prev,
      [attrIdStr]: !prev[attrIdStr]
    }));

    // If selecting the attribute, select all its values
    if (!isCurrentlySelected) {
      const attr = attributes.find(a => String(a.id) === attrIdStr);
      if (attr && attr.attribute_values) {
        const allValueIds = attr.attribute_values.map(v => String(v.id));
        setSelectedValues(prev => ({
          ...prev,
          [attrIdStr]: allValueIds
        }));
      }
    } else {
      // If deselecting, clear all values
      setSelectedValues(prev => ({
        ...prev,
        [attrIdStr]: []
      }));
    }
  };

  const handleValueToggle = (attrId, valueId) => {
    // Ensure consistent string comparison
    const attrIdStr = String(attrId);
    const valueIdStr = String(valueId);

    // Auto-select the attribute if not already selected
    if (!selectedAttributes[attrIdStr]) {
      setSelectedAttributes(prev => ({
        ...prev,
        [attrIdStr]: true
      }));
    }

    setSelectedValues(prev => ({
      ...prev,
      [attrIdStr]: prev[attrIdStr]?.includes(valueIdStr)
        ? prev[attrIdStr].filter(v => v !== valueIdStr)
        : [...(prev[attrIdStr] || []), valueIdStr]
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

      // Check if this combination already exists
      const combinationExists = variants.some(variant => {
        // Check if variant has the same number of options as selected attributes
        if (variant.variant_options?.length !== selectedAttrs.length) {
          return false;
        }

        // Check if all attribute-value pairs match
        return variant.variant_options.every(opt => {
          const selectedValueId = manualVariant[opt.attribute_id];
          return selectedValueId && String(opt.attribute_value_id) === String(selectedValueId);
        });
      });

      if (combinationExists) {
        setMessage({ type: 'error', text: 'This variant combination already exists!' });
        setIsSaving(false);
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      console.log('Adding manual variant:', manualVariant);

      // Create the variant combination
      const combination = selectedAttrs.map(attrId => {
        const attr = attributes.find(a => a.id === attrId);
        const value = attr?.attribute_values?.find(v => v.id === manualVariant[attrId]);
        return {
          attribute_id: attrId,
          attribute_value_id: value?.id,
          attribute_name: attr?.name,
          value: value?.value
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
        resetUnsavedChanges();
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
    // Check for selected values instead of just attributes
    const hasSelectedValues = Object.keys(selectedValues).some(
      attrId => selectedValues[attrId] && selectedValues[attrId].length > 0
    );

    if (!hasSelectedValues) {
      setMessage({ type: 'error', text: 'Please select at least one attribute value' });
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

      // Filter selectedValues to only include attributes with values
      const filteredValues = Object.keys(selectedValues).reduce((acc, key) => {
        if (selectedValues[key] && selectedValues[key].length > 0) {
          acc[key] = selectedValues[key];
        }
        return acc;
      }, {});

      if (Object.keys(filteredValues).length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one attribute value' });
        setIsGenerating(false);
        return;
      }

      console.log('Generating variants with mode:', mode);
      console.log('Selected attributes:', selectedAttributes);
      console.log('Selected values:', selectedValues);
      console.log('Filtered values for generation:', filteredValues);

      const res = await fetch(`/api/variants/generate?productId=${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          selectedValues: filteredValues
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
        resetUnsavedChanges();
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
          resetUnsavedChanges();
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
        const value = attr?.attribute_values?.find(v => v.id === opt.attribute_value_id);
        return `${attr?.name}:${value?.value}`;
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
        // Find the attribute value to get its current value
        const attributeValue = attributes
          .flatMap(attr => attr.attribute_values || [])
          .find(val => val.id === attributeValueId);

        if (!attributeValue) {
          throw new Error('Attribute value not found');
        }

        const res = await fetch(`/api/attributes/values/${attributeValueId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: attributeValue.value,
            imageUrl: base64
          })
        });

        if (res.ok) {
          setMessage({ type: 'success', text: 'Image uploaded successfully!' });
          setTimeout(() => setMessage(null), 2000);

          // Refresh data to show updated image
          await fetchData();
        } else {
          const error = await res.json();
          throw new Error(error.error || 'Failed to upload image');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        setMessage({ type: 'error', text: error.message || 'Failed to upload image' });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };


  const handleSaveRecommendations = async () => {
    try {
      setIsSaving(true);
      console.log('Saving recommendations (internal IDs):', selectedRecommendations);
      console.log('Product ID:', productId);

      // Convert internal IDs to Shopify product IDs for the API
      const shopifyProductIds = selectedRecommendations.map(internalId => {
        const product = allProducts.find(p => p.id === internalId);
        return product?.id; // Since products API returns internal ID as 'id', we use the internal ID
      }).filter(Boolean);

      console.log('Converted to IDs for API:', shopifyProductIds);

      const res = await fetch(`/api/recommendations?productId=${encodeURIComponent(productId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendedProductIds: shopifyProductIds })
      });

      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);

      if (res.ok) {
        setMessage({ type: 'success', text: 'Recommendations saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
        resetUnsavedChanges();
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

  return (
    <div className={styles.container}>
      <Head>
        <title>Edit Product{product ? ` - ${product.title}` : ''}</title>
      </Head>

      <Sidebar />

      {message && (
        <div className={`${styles.toast} ${message.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <div className={styles.toastIcon}>
            {message.type === 'success' ? '✓' : '✕'}
          </div>
          <div className={styles.toastText}>{message.text}</div>
        </div>
      )}

      <main className={styles.main}>
        {loading ? (
          <>
            <div className={styles.header}>
              <div>
                <Link
                  href={`/?shop=${router.query.shop || ''}${router.query.host ? `&host=${router.query.host}` : ''}`}
                  className={styles.backLink}
                >
                  ← Back to Products
                </Link>
                <h1>Loading Product...</h1>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
              <LoadingSpinner size="large" text="Loading product details..." />
            </div>
          </>
        ) : !product ? (
          <>
            <div className={styles.header}>
              <h1>Product Not Found</h1>
            </div>
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              <p>The product you're looking for could not be found.</p>
              <Link
                href={`/?shop=${router.query.shop || ''}${router.query.host ? `&host=${router.query.host}` : ''}`}
                className={styles.backLink}
                style={{ display: 'inline-block', marginTop: '20px' }}
              >
                ← Back to Products
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <Link
                  href={`/?shop=${router.query.shop || ''}${router.query.host ? `&host=${router.query.host}` : ''}`}
                  className={styles.backLink}
                  onClick={(e) => {
                    if (hasUnsavedChanges) {
                      if (!confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
                        e.preventDefault();
                      }
                    }
                  }}
                >
                  ← Back to Products
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h1>{product.title}</h1>
              {hasUnsavedChanges && (
                <span style={{
                  padding: '4px 12px',
                  background: '#ff9800',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Unsaved Changes
                </span>
              )}
            </div>

            {/* Is Ring Checkbox */}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRing}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setIsRing(newValue);

                    // Save to database
                    try {
                      const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ is_ring: newValue })
                      });

                      if (!res.ok) {
                        throw new Error('Failed to update is_ring');
                      }

                      setMessage({ type: 'success', text: newValue ? 'Marked as ring product' : 'Unmarked as ring product' });
                      setTimeout(() => setMessage(null), 2000);
                    } catch (error) {
                      console.error('Error updating is_ring:', error);
                      setMessage({ type: 'error', text: 'Failed to update ring status' });
                      setTimeout(() => setMessage(null), 3000);
                      setIsRing(!newValue); // Revert on error
                    }
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: '500' }}>This is a ring product (requires Ring Size)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'attributes' ? styles.active : ''}`}
            onClick={() => setActiveTab('attributes')}
          >
            Attributes & Values
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'variants' ? styles.active : ''}`}
            onClick={() => setActiveTab('variants')}
          >
            Product Variations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'recommendations' ? styles.active : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            Product Recommendations
          </button>
        </div>

        {/* Attributes & Values Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'attributes' ? styles.active : ''}`}>
        <div className={styles.section}>
          <h2>Attributes & Values</h2>
          <p className={styles.subtitle}>Select attributes and their values to create product variations</p>

          {isRing && (
            <div className={styles.section} style={{ marginBottom: '2rem', background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#202223' }}>Ring Size Selection</h3>
              <p style={{ fontSize: '14px', color: '#6d7175', marginBottom: '1rem' }}>
                This field will be collected from customers but does not affect pricing or product variations.
              </p>
              <div style={{ maxWidth: '600px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Available Ring Sizes
                </label>
                <textarea
                  value={ringSizes.join(', ')}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Parse the comma-separated values
                    const sizes = value.split(',').map(s => {
                      const trimmed = s.trim();
                      const parsed = parseFloat(trimmed);
                      return isNaN(parsed) ? null : parsed;
                    }).filter(s => s !== null);
                    setRingSizes(sizes);
                  }}
                  onBlur={async () => {
                    // Save to database
                    try {
                      await fetch(`/api/products/${encodeURIComponent(productId)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ring_sizes: ringSizes })
                      });
                      setMessage({ type: 'success', text: 'Ring sizes saved successfully' });
                      setTimeout(() => setMessage(null), 3000);
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Failed to save ring sizes' });
                      setTimeout(() => setMessage(null), 3000);
                    }
                  }}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem',
                    fontSize: '14px',
                    border: '1px solid #d1d1d1',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Enter ring sizes separated by commas (e.g., 4, 4.25, 4.5, 5, ...)"
                />
                <p style={{ fontSize: '13px', color: '#6d7175', marginTop: '0.5rem' }}>
                  Enter ring sizes separated by commas. Values will be sorted automatically.
                </p>
                <p style={{ fontSize: '13px', color: '#6d7175', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  Ring size will be collected at checkout and stored with the order.
                </p>
              </div>
            </div>
          )}

          <div className={styles.attributesGrid}>
            {attributes.map(attr => {
              const attrIdStr = String(attr.id);
              return (
              <div key={attr.id} className={styles.attributeCard}>
                <label className={styles.attributeLabel}>
                  <input
                    type="checkbox"
                    checked={selectedAttributes[attrIdStr] || false}
                    onChange={() => handleAttributeToggle(attr.id)}
                  />
                  <span style={{ fontSize: '15px' }}>{attr.name}</span>
                </label>

                {attr.attribute_values?.length > 0 && (
                  <div className={styles.valuesGrid}>
                    {attr.attribute_values.map(val => {
                      const valIdStr = String(val.id);
                      const attrIdStr = String(attr.id);
                      const isSelected = selectedValues[attrIdStr]?.includes(valIdStr) || false;

                      return (
                        <div
                          key={val.id}
                          className={styles.valueItemWithImage}
                          style={{
                            borderColor: isSelected ? '#008060' : '#e3e5e7',
                            background: isSelected ? '#f6faf9' : 'white',
                            boxShadow: isSelected ? '0 0 0 2px rgba(0, 128, 96, 0.1)' : 'none'
                          }}
                        >
                          <div className={styles.valueCheckbox}>
                            <label className={styles.valueLabel}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleValueToggle(attr.id, val.id)}
                              />
                              <span style={{ fontWeight: isSelected ? '600' : '400' }}>
                                {val.value}
                                {isSelected && <span style={{ marginLeft: '6px', color: '#008060' }}>✓</span>}
                              </span>
                            </label>
                          </div>

                          {/* Image upload section - always visible */}
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })}
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
        </div>
        {/* End Attributes & Values Tab */}

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

        {/* Product Variations Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'variants' ? styles.active : ''}`}>
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
                      placeholder="Price"
                      value={bulkValue}
                      onChange={e => setBulkValue(e.target.value)}
                      step="0.01"
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
                          console.warn('No attribute values found for:', opt.attribute?.name || 'Unknown');
                          return (
                            <div key={opt.id} style={{ marginBottom: '8px', padding: '6px', background: '#fff3cd', borderRadius: '4px' }}>
                              <strong>{opt.attribute?.name || 'Unknown'}:</strong> {opt.attribute_value?.value || 'N/A'}
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
                        if (!attr) return null;
                        // Get only selected values for this attribute
                        const attrIdStr = String(attrId);
                        const selectedValuesForAttr = selectedValues[attrIdStr] || [];
                        const availableValues = attr?.attribute_values?.filter(val =>
                          selectedValuesForAttr.includes(String(val.id))
                        ) || [];

                        return (
                          <div key={attrId} className={styles.formGroup}>
                            <label>{attr.name}</label>
                            <select
                              value={manualVariant[attrId] || ''}
                              onChange={(e) => setManualVariant({ ...manualVariant, [attrId]: e.target.value })}
                              className={styles.formSelect}
                            >
                              <option value="">Select {attr.name}...</option>
                              {availableValues.map(val => (
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
        </div>
        {/* End Product Variations Tab */}

        {/* Product Recommendations Tab */}
        <div className={`${styles.tabContent} ${activeTab === 'recommendations' ? styles.active : ''}`}>
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
        </div>
        {/* End Product Recommendations Tab */}
        </>
        )}
      </main>
    </div>
  );
}
