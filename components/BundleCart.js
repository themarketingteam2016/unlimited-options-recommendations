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

  const handleBulkAddToCart = () => {
    const missingSelection = recommendations.find(
      rec => !selectedVariants[rec.recommended_product.id]
    );

    if (missingSelection) {
      handleProductClick(missingSelection.recommended_product);
      return;
    }

    // Add all selected variants to cart
    const cartItems = recommendations.map(rec => ({
      productId: rec.recommended_product.id,
      variantId: selectedVariants[rec.recommended_product.id]
    }));

    console.log('Adding to cart:', cartItems);
    alert(`Added ${cartItems.length} products to cart!`);
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
