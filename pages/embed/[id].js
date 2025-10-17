import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import BundleCart from '../../components/BundleCart';
import styles from '../../styles/Embed.module.css';

export default function EmbedWidget() {
  const router = useRouter();
  const { id: encodedId } = router.query;
  const id = encodedId ? decodeURIComponent(encodedId) : null;

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [primaryAttribute, setPrimaryAttribute] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

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

      console.log('Embed Widget - Product ID:', id);
      console.log('Embed Widget - Found Product:', foundProduct);

      // Fetch variants (encode ID to handle special characters)
      const variantsRes = await fetch(`/api/products/${encodeURIComponent(id)}/variants`);
      const variantsData = await variantsRes.json();
      console.log('Embed Widget - Variants Response:', variantsData);
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
        const extractedAttributes = Object.values(uniqueAttrs);
        console.log('Embed Widget - Extracted Attributes:', extractedAttributes);
        setAttributes(extractedAttributes);

        // Pre-select default values
        const defaultOptions = {};
        extractedAttributes.forEach(attr => {
          const defaultValue = attr.values.find(v => v.is_default);
          if (defaultValue) {
            defaultOptions[attr.id] = defaultValue.id;
          }
        });
        if (Object.keys(defaultOptions).length > 0) {
          console.log('Embed Widget - Setting default options:', defaultOptions);
          setSelectedOptions(defaultOptions);
        }
      } else {
        console.log('Embed Widget - No variants data to extract attributes from');
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

  const getPrimaryOptionValue = () => {
    if (primaryAttribute && selectedOptions[primaryAttribute.id]) {
      const primaryValue = attributes
        .find(a => a.id === primaryAttribute.id)
        ?.values.find(v => v.id === selectedOptions[primaryAttribute.id]);

      return primaryValue?.value;
    }
    return null;
  };

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    // Send message to parent window (if embedded)
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'ADD_TO_CART',
        variant: selectedVariant,
        quantity: quantity,
        product: product
      }, '*');
    }

    // Also trigger Shopify add to cart if available
    alert(`Added ${quantity} × ${product.title} to cart!\nVariant ID: ${selectedVariant.id}\nPrice: $${selectedVariant.price}`);
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!product) {
    return <div className={styles.loading}>Product not found</div>;
  }

  const allOptionsSelected = attributes.every(attr => selectedOptions[attr.id]);
  const canAddToCart = allOptionsSelected && selectedVariant && selectedVariant.stock_quantity > 0;

  return (
    <div className={styles.widget}>
      <Head>
        <title>{product.title} - Customizer</title>
      </Head>

      <div className={styles.widgetContent}>
        <h2 className={styles.title}>{product.title}</h2>

        {attributes.length > 0 && (
          <div className={styles.optionsSection}>
            {attributes.map(attr => (
              <div key={attr.id} className={styles.optionGroup}>
                <label className={styles.optionLabel}>
                  {attr.name}
                  {attr.is_primary && <span className={styles.badge}>Primary</span>}
                </label>
                <select
                  className={styles.dropdown}
                  value={selectedOptions[attr.id] || ''}
                  onChange={(e) => handleOptionSelect(attr.id, e.target.value)}
                >
                  <option value="">Choose {attr.name}</option>
                  {attr.values.map(value => (
                    <option key={value.id} value={value.id}>
                      {value.value}
                    </option>
                  ))}
                </select>
                {selectedOptions[attr.id] && (
                  <div className={styles.imagePreview}>
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

        <div className={styles.quantitySection}>
          <label>Quantity:</label>
          <div className={styles.quantityControl}>
            <button
              className={styles.quantityBtn}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={!canAddToCart}
            >
              -
            </button>
            <input
              type="number"
              className={styles.quantityInput}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              disabled={!canAddToCart}
            />
            <button
              className={styles.quantityBtn}
              onClick={() => setQuantity(quantity + 1)}
              disabled={!canAddToCart}
            >
              +
            </button>
          </div>
        </div>

        <button
          className={styles.addToCartBtn}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
        >
          {!allOptionsSelected
            ? 'Select All Options'
            : !selectedVariant
            ? 'Variant Not Available'
            : selectedVariant.stock_quantity === 0
            ? 'Out of Stock'
            : 'Add to Cart'}
        </button>

        {selectedVariant && selectedVariant.sku && (
          <div className={styles.sku}>SKU: {selectedVariant.sku}</div>
        )}
      </div>

      <BundleCart productId={id} primaryOptionValue={getPrimaryOptionValue()} />
    </div>
  );
}
