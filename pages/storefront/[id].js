import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import BundleCart from '../../components/BundleCart';
import styles from '../../styles/Storefront.module.css';

export default function Storefront() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [primaryAttribute, setPrimaryAttribute] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const variantsRes = await fetch(`/api/products/${id}/variants`);
      const variantsData = await variantsRes.json();
      setVariants(Array.isArray(variantsData) ? variantsData : []);

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
        setAttributes(Object.values(uniqueAttrs));
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
                      {attr.is_primary && <span className={styles.primaryBadge}>Primary</span>}
                    </label>
                    <div className={styles.optionButtons}>
                      {attr.values.map(value => (
                        <button
                          key={value.id}
                          className={`${styles.optionButton} ${
                            selectedOptions[attr.id] === value.id ? styles.selected : ''
                          }`}
                          onClick={() => handleOptionSelect(attr.id, value.id)}
                        >
                          {value.image_url && (
                            <img src={value.image_url} alt={value.value} className={styles.optionImg} />
                          )}
                          {value.value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedVariant && (
              <div className={styles.priceSection}>
                <div className={styles.price}>${selectedVariant.price}</div>
                <div className={styles.stock}>
                  {selectedVariant.stock_quantity > 0
                    ? `In Stock: ${selectedVariant.stock_quantity}`
                    : 'Out of Stock'}
                </div>
              </div>
            )}

            <button
              className={styles.addToCartButton}
              disabled={!selectedVariant || selectedVariant.stock_quantity === 0}
            >
              {selectedVariant
                ? selectedVariant.stock_quantity > 0
                  ? 'Add to Cart'
                  : 'Out of Stock'
                : 'Select Options'}
            </button>
          </div>
        </div>

        <BundleCart productId={id} primaryOptionValue={getPrimaryOptionValue()} />
      </main>
    </div>
  );
}
