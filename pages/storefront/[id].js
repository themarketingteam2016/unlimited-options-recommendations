import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import BundleCart from '../../components/BundleCart';
import styles from '../../styles/Storefront.module.css';

export default function Storefront() {
  const router = useRouter();
  const { id: encodedId } = router.query;
  const id = encodedId ? decodeURIComponent(encodedId) : null;

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [primaryAttribute, setPrimaryAttribute] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ringSize, setRingSize] = useState('');

  useEffect(() => {
    if (id) {
      fetchProductData();
    }
  }, [id]);

  useEffect(() => {
    if (Object.keys(selectedOptions).length > 0 && variants.length > 0) {
      findMatchingVariant();
    }
  }, [selectedOptions]);

  const fetchProductData = async () => {
    try {
      // Fetch product
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      const foundProduct = productsData.find(p => p.id === id);
      setProduct(foundProduct);

      // Fetch variants
      const variantsRes = await fetch(`/api/products/${encodeURIComponent(id)}/variants`);
      const variantsData = await variantsRes.json();
      setVariants(Array.isArray(variantsData) ? variantsData : []);

      // Fetch recommendations
      const recsRes = await fetch(`/api/products/${encodeURIComponent(id)}/recommendations`);
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecommendations(Array.isArray(recsData) ? recsData : []);
      }

      // Extract unique attributes
      if (variantsData && variantsData.length > 0) {
        const uniqueAttrs = {};
        variantsData.forEach(variant => {
          variant.variant_options?.forEach(opt => {
            if (opt.attribute) {
              if (!uniqueAttrs[opt.attribute.id]) {
                uniqueAttrs[opt.attribute.id] = {
                  ...opt.attribute,
                  values: []
                };
              }
              if (!uniqueAttrs[opt.attribute.id].values.find(v => v.id === opt.attribute_value.id)) {
                uniqueAttrs[opt.attribute.id].values.push(opt.attribute_value);
              }

              if (opt.attribute.is_primary) {
                setPrimaryAttribute(opt.attribute);
              }
            }
          });
        });
        const extractedAttributes = Object.values(uniqueAttrs);
        setAttributes(extractedAttributes);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching product data:', error);
      setLoading(false);
    }
  };

  const findMatchingVariant = () => {
    const match = variants.find(variant => {
      return variant.variant_options?.every(opt =>
        selectedOptions[opt.attribute.id] === opt.attribute_value.id
      );
    });

    setSelectedVariant(match || null);
  };

  const handleOptionSelect = (attributeId, valueId) => {
    setSelectedOptions({
      ...selectedOptions,
      [attributeId]: valueId
    });
  };

  const getCurrentImage = () => {
    if (primaryAttribute && selectedOptions[primaryAttribute.id]) {
      const primaryValue = attributes
        .find(a => a.id === primaryAttribute.id)
        ?.values.find(v => v.id === selectedOptions[primaryAttribute.id]);

      if (primaryValue?.image_url) {
        return primaryValue.image_url;
      }
    }

    return product?.image_url || product?.featuredImage?.url;
  };

  const getPrimaryOptionValue = () => {
    if (primaryAttribute && selectedOptions[primaryAttribute.id]) {
      const primaryValue = attributes
        .find(a => a.id === primaryAttribute.id)
        ?.values.find(v => v.id === selectedOptions[primaryAttribute.id]);

      return primaryValue?.value;
    }
    return null;
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
        <title>{product.title} - Storefront</title>
      </Head>

      <main className={styles.main}>
        <div className={styles.productSection}>
          <div className={styles.imageSection}>
            <img
              src={getCurrentImage()}
              alt={product.title}
              className={styles.mainImage}
            />
          </div>

          <div className={styles.infoSection}>
            <h1>{product.title}</h1>

            {attributes.length > 0 && (
              <div className={styles.optionsSection}>
                {attributes.map(attr => (
                  <div key={attr.id} className={styles.optionGroup}>
                    <label>
                      {attr.name}
                    </label>
                    <select
                      className={styles.dropdown}
                      value={selectedOptions[attr.id] || ''}
                      onChange={(e) => handleOptionSelect(attr.id, e.target.value)}
                    >
                      <option value="">Select {attr.name}</option>
                      {attr.values.map(value => (
                        <option key={value.id} value={value.id}>
                          {value.value}
                        </option>
                      ))}
                    </select>
                    {selectedOptions[attr.id] && (
                      <div className={styles.selectedImagePreview}>
                        {attr.values.find(v => v.id === selectedOptions[attr.id])?.image_url && (
                          <img
                            src={attr.values.find(v => v.id === selectedOptions[attr.id])?.image_url}
                            alt={attr.values.find(v => v.id === selectedOptions[attr.id])?.value}
                            className={styles.previewImg}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {product?.is_ring && (
              <div className={styles.optionsSection}>
                <div className={styles.optionGroup}>
                  <label>Ring Size</label>
                  <select
                    className={styles.dropdown}
                    value={ringSize}
                    onChange={(e) => setRingSize(e.target.value)}
                  >
                    <option value="">Select Ring Size</option>
                    {[4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className={styles.priceSection}>
              {selectedVariant ? (
                <div className={styles.price}>${selectedVariant.price}</div>
              ) : (
                <div className={styles.pricePlaceholder}>Price shown after selections</div>
              )}
            </div>

            <button
              className={styles.addToCartButton}
              disabled={!selectedVariant}
            >
              {selectedVariant ? 'Add to Cart' : 'Select Options'}
            </button>
          </div>
        </div>

        <BundleCart productId={id} primaryOptionValue={getPrimaryOptionValue()} />

        {recommendations.length > 0 && (
          <div className={styles.recommendationsSection}>
            <h2>You May Also Like</h2>
            <div className={styles.recommendationsGrid}>
              {recommendations.map(rec => (
                <a
                  key={rec.id}
                  href={`/storefront/${encodeURIComponent(rec.recommended_product.shopify_product_id)}`}
                  className={styles.recommendationCard}
                >
                  {(rec.recommended_product.image_url || rec.recommended_product.featuredImage?.url) && (
                    <img
                      src={rec.recommended_product.image_url || rec.recommended_product.featuredImage?.url}
                      alt={rec.recommended_product.title}
                      className={styles.recImage}
                    />
                  )}
                  <h3>{rec.recommended_product.title}</h3>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
