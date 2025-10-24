import { useState, useEffect } from 'react';
import styles from './BundleCart.module.css';

export default function BundleCart({ productId, primaryOptionValue }) {
  const [recommendations, setRecommendations] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [productId]);

  useEffect(() => {
    // Update displayed images based on primary option value
    if (primaryOptionValue && recommendations.length > 0) {
      updateRecommendationImages();
    }
  }, [primaryOptionValue]);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId)}/recommendations`);
      const data = await res.json();
      setRecommendations(Array.isArray(data) ? data.slice(0, 2) : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setLoading(false);
    }
  };

  const updateRecommendationImages = async () => {
    // Fetch variants for each recommended product that match the primary option value
    for (const rec of recommendations) {
      const res = await fetch(`/api/products/${encodeURIComponent(rec.recommended_product.id)}/variants`);
      const variants = await res.json();

      // Find variant with matching primary option value
      const matchingVariant = variants.find(v =>
        v.variant_options?.some(opt =>
          opt.attribute?.is_primary && opt.attribute_value?.value === primaryOptionValue
        )
      );

      if (matchingVariant) {
        const primaryOption = matchingVariant.variant_options?.find(opt => opt.attribute?.is_primary);
        if (primaryOption?.attribute_value?.image_url) {
          // Update recommendation image
          setRecommendations(prev =>
            prev.map(r =>
              r.id === rec.id
                ? { ...r, displayImage: primaryOption.attribute_value.image_url }
                : r
            )
          );
        }
      }
    }
  };

  const handleProductClick = async (product) => {
    // Fetch variants for this product
    const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/variants`);
    const variants = await res.json();

    if (variants.length > 1) {
      setCurrentProduct({ ...product, variants });
      setShowVariantModal(true);
    } else if (variants.length === 1) {
      setSelectedVariants({ ...selectedVariants, [product.id]: variants[0].id });
    }
  };

  const handleVariantSelect = (productId, variantId) => {
    setSelectedVariants({ ...selectedVariants, [productId]: variantId });
    setShowVariantModal(false);
    setCurrentProduct(null);
  };

  const handleBulkAddToCart = async () => {
    const missingSelection = recommendations.find(
      rec => !selectedVariants[rec.recommended_product.id]
    );

    if (missingSelection) {
      handleProductClick(missingSelection.recommended_product);
      return;
    }

    try {
      console.log('[Bundle Add] Starting bundle add to cart');

      // Prepare all items to add to cart
      const itemsToAdd = [];

      // Process each recommendation variant
      for (const rec of recommendations) {
        const variantId = selectedVariants[rec.recommended_product.id];

        console.log('[Bundle Add] Processing variant:', variantId);

        // Call API to prepare cart data
        const apiResponse = await fetch(`/api/cart/add-variant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantId: variantId,
            quantity: 1
          })
        });

        if (!apiResponse.ok) {
          const error = await apiResponse.json();
          throw new Error(error.error || 'Failed to prepare cart item');
        }

        const apiData = await apiResponse.json();
        console.log('[Bundle Add] API response:', apiData);

        if (apiData.success && apiData.cartData) {
          itemsToAdd.push(apiData.cartData);
        } else if (apiData.fallback && apiData.variant) {
          // Handle fallback mode
          const properties = {
            '_Custom_Variant': 'Yes',
            '_SKU': apiData.variant.sku || 'Custom',
            '_Price': `$${apiData.variant.price}`
          };

          apiData.variant.options?.forEach(opt => {
            properties[opt.name] = opt.value;
          });

          // Use fallback variant ID if available
          const fallbackVariantId = apiData.variant.shopify_variant_id || rec.recommended_product.shopify_product_id;

          if (fallbackVariantId) {
            itemsToAdd.push({
              id: fallbackVariantId,
              quantity: 1,
              properties: properties
            });
          }
        }
      }

      console.log('[Bundle Add] Final items to add:', itemsToAdd);

      if (itemsToAdd.length === 0) {
        throw new Error('No items to add to cart');
      }

      // Add all items to Shopify cart
      const cartResponse = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToAdd })
      });

      if (!cartResponse.ok) {
        const cartError = await cartResponse.json();
        throw new Error(cartError.description || cartError.message || 'Failed to add to cart');
      }

      const cartData = await cartResponse.json();
      console.log('[Bundle Add] Cart add success:', cartData);

      // Trigger cart update events
      document.dispatchEvent(new CustomEvent('cart:updated'));
      document.dispatchEvent(new CustomEvent('cart:refresh'));

      if (typeof jQuery !== 'undefined') {
        jQuery(document).trigger('cart.updated');
      }

      // Success notification
      alert(`Successfully added ${itemsToAdd.length} item${itemsToAdd.length > 1 ? 's' : ''} to cart!`);

      // Clear selections
      setSelectedVariants({});

    } catch (error) {
      console.error('[Bundle Add] Error:', error);
      alert(`Failed to add bundle to cart: ${error.message}`);
    }
  };

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <div className={styles.bundleCart}>
      <h3>Recommended Bundle</h3>
      <div className={styles.recommendations}>
        {recommendations.map(rec => (
          <div
            key={rec.id}
            className={styles.recommendedProduct}
            onClick={() => handleProductClick(rec.recommended_product)}
          >
            <img
              src={rec.displayImage || rec.recommended_product.image_url}
              alt={rec.recommended_product.title}
              className={styles.productImage}
            />
            <h4>{rec.recommended_product.title}</h4>
            {selectedVariants[rec.recommended_product.id] && (
              <span className={styles.selected}>✓ Selected</span>
            )}
          </div>
        ))}
      </div>

      <button
        className={styles.bulkAddButton}
        onClick={handleBulkAddToCart}
      >
        Add Bundle to Cart
      </button>

      {showVariantModal && currentProduct && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Select Variant for {currentProduct.title}</h3>
            <div className={styles.variantsList}>
              {currentProduct.variants.map(variant => (
                <div
                  key={variant.id}
                  className={styles.variantOption}
                  onClick={() => handleVariantSelect(currentProduct.id, variant.id)}
                >
                  {variant.variant_options?.map(opt => (
                    <div key={opt.id} className={styles.optionTag}>
                      {opt.attribute_value?.image_url && (
                        <img
                          src={opt.attribute_value.image_url}
                          alt={opt.attribute_value.value}
                          className={styles.optionImg}
                        />
                      )}
                      {opt.attribute?.name}: {opt.attribute_value?.value}
                    </div>
                  ))}
                  <div className={styles.price}>${variant.price}</div>
                </div>
              ))}
            </div>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setShowVariantModal(false);
                setCurrentProduct(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
