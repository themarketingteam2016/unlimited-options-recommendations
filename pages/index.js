import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [options, setOptions] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [newOption, setNewOption] = useState({ name: '', value: '' });
  const [shop, setShop] = useState(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const productsPerPage = 12;

  useEffect(() => {
    // Check if we're in an iframe (embedded app)
    setIsEmbedded(window.top !== window.self);

    // Wait for router to be ready before reading query params
    if (router.isReady) {
      const shopParam = router.query.shop;
      console.log('[Home] Router ready, shop param:', shopParam);
      if (shopParam) {
        setShop(shopParam);
      } else {
        // For custom apps accessed via /auth, shop should always be in URL
        console.warn('[Home] No shop parameter found in URL');
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (shop) {
      fetchProducts();
    }
  }, [shop]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?v=2&shop=${shop}`);
      const data = await res.json();

      // For custom apps, no OAuth redirects needed
      if (data.error) {
        console.error('Error fetching products:', data.error);
        setMessage({ type: 'error', text: data.error });
      }

      setProducts(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setLoading(false);
    }
  };

  const selectProduct = async (product) => {
    setSelectedProduct(product);
    setActiveTab('options');

    try {
      const res = await fetch(`/api/options/${product.id.split('/').pop()}`);
      const data = await res.json();
      if (data.length > 0) {
        setOptions(data);
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const addOption = () => {
    if (!newOption.name) return;
    const existing = options.find(o => o.option_name === newOption.name);
    if (existing) {
      setMessage({ type: 'error', text: 'Option already exists!' });
      return;
    }
    setOptions([...options, { option_name: newOption.name, values: [] }]);
    setNewOption({ name: '', value: '' });
  };

  const addValueToOption = (optionName) => {
    if (!newOption.value) return;
    setOptions(options.map(opt => {
      if (opt.option_name === optionName) {
        if (opt.values.includes(newOption.value)) {
          setMessage({ type: 'error', text: 'Value already exists!' });
          return opt;
        }
        return { ...opt, values: [...opt.values, newOption.value] };
      }
      return opt;
    }));
    setNewOption({ ...newOption, value: '' });
  };

  const removeValue = (optionName, value) => {
    setOptions(options.map(opt => {
      if (opt.option_name === optionName) {
        return { ...opt, values: opt.values.filter(v => v !== value) };
      }
      return opt;
    }));
  };

  const removeOption = (optionName) => {
    setOptions(options.filter(o => o.option_name !== optionName));
  };

  const saveOptions = async () => {
    try {
      const productId = selectedProduct.id.split('/').pop();
      const formattedOptions = options.map(o => ({
        name: o.option_name,
        values: o.values
      }));

      await fetch('/api/options/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, options: formattedOptions })
      });

      setMessage({ type: 'success', text: 'Options saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save options!' });
    }
  };

  const generateCombinations = async () => {
    try {
      const formattedOptions = options.map(o => ({
        name: o.option_name,
        values: o.values
      }));

      const res = await fetch('/api/options/generate-combinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: formattedOptions })
      });

      const data = await res.json();
      const variantsWithDefaults = data.map(combo => ({
        options: combo,
        price: '',
        sku: '',
        inventory_qty: 0,
        is_active: true
      }));

      setCombinations(variantsWithDefaults);
      setActiveTab('variants');
      setMessage({ type: 'success', text: `Generated ${data.length} combinations!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate combinations!' });
    }
  };

  const updateVariantField = (index, field, value) => {
    setCombinations(combinations.map((v, i) => {
      if (i === index) {
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  const saveVariants = async () => {
    try {
      const productId = selectedProduct.id.split('/').pop();
      await fetch('/api/variants/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variants: combinations })
      });

      setMessage({ type: 'success', text: 'Variants saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save variants!' });
    }
  };

  // Filter and paginate products
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // For custom apps, shop parameter comes from query string
  if (!shop) {
    // Show different message based on router state
    if (!router.isReady) {
      return (
        <div className={styles.loading}>
          <p>Initializing app...</p>
        </div>
      );
    }

    // Router is ready but no shop param
    return (
      <div className={styles.loading}>
        <p>Missing shop parameter.</p>
        <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
        <p>Please access this app through your Shopify Admin → Apps menu.</p>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loading}>Loading products...</div>;
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Unlimited Product Options</title>
        <meta name="description" content="Create unlimited variants beyond Shopify's 100 variant limit" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar />

      <main className={styles.main}>
        <h1 className={styles.title}>Unlimited Product Options</h1>
        <p className={styles.description}>Create unlimited variants beyond Shopify's 100 variant limit</p>

        {message && (
          <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
            {message.text}
          </div>
        )}

        {!selectedProduct ? (
          <>
            <div className={styles.header}>
              <h2>Select a Product</h2>
              {products.length > 0 && (
                <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '12px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                    Showing {currentProducts.length} of {filteredProducts.length} products
                    {searchTerm && ` (filtered from ${products.length} total)`}
                  </p>
                </div>
              )}
            </div>
            {products.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No products found. Make sure your Shopify store has products.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No products match your search.</p>
                <button
                  onClick={() => setSearchTerm('')}
                  className={styles.btnSecondary}
                  style={{ marginTop: '16px' }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <>
                <div className={styles.productGrid}>
                  {currentProducts.map(product => (
                    <div
                      key={product.id}
                      className={styles.productCard}
                    >
                      {product.featuredImage && (
                        <img src={product.featuredImage.url} alt={product.title} className={styles.productImage} />
                      )}
                      <h3>{product.title}</h3>
                      <p className={styles.productStatus}>{product.status}</p>
                      <Link
                        href={`/products/edit?productId=${encodeURIComponent(product.id)}&shop=${shop}${router.query.host ? `&host=${router.query.host}` : ''}`}
                        className={styles.editButton}
                      >
                        Edit Variants
                      </Link>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '32px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={styles.btnSecondary}
                      style={{
                        opacity: currentPage === 1 ? 0.5 : 1,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      ← Previous
                    </button>

                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? styles.btnPrimary : styles.btnSecondary}
                          style={{
                            minWidth: '40px',
                            padding: '8px 12px'
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={styles.btnSecondary}
                      style={{
                        opacity: currentPage === totalPages ? 0.5 : 1,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h2>{selectedProduct.title}</h2>
                <p className={styles.subtitle}>Configure unlimited options and variants</p>
              </div>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  setSelectedProduct(null);
                  setOptions([]);
                  setCombinations([]);
                }}
              >
                ← Back to Products
              </button>
            </div>

            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'options' ? styles.active : ''}`}
                onClick={() => setActiveTab('options')}
              >
                Options ({options.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'variants' ? styles.active : ''}`}
                onClick={() => setActiveTab('variants')}
              >
                Variants ({combinations.length})
              </button>
            </div>

            {activeTab === 'options' && (
              <>
                <h3>Create Options</h3>
                <div className={styles.inputGroup}>
                  <label>Option Name (e.g., Size, Color, Material)</label>
                  <div className={styles.flex}>
                    <input
                      type="text"
                      value={newOption.name}
                      onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                      placeholder="Enter option name"
                    />
                    <button className={styles.btnPrimary} onClick={addOption}>Add Option</button>
                  </div>
                </div>

                {options.map(option => (
                  <div key={option.option_name} className={styles.optionItem}>
                    <div className={styles.flexBetween}>
                      <h3>{option.option_name}</h3>
                      <button className={styles.btnDanger} onClick={() => removeOption(option.option_name)}>Remove</button>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Add Values</label>
                      <div className={styles.flex}>
                        <input
                          type="text"
                          value={newOption.value}
                          onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                          placeholder="Enter value"
                        />
                        <button className={styles.btnPrimary} onClick={() => addValueToOption(option.option_name)}>Add</button>
                      </div>
                    </div>

                    <div className={styles.optionValues}>
                      {option.values.map(value => (
                        <div key={value} className={styles.valueTag}>
                          {value}
                          <button onClick={() => removeValue(option.option_name, value)}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {options.length > 0 && (
                  <div className={styles.flex} style={{marginTop: '20px'}}>
                    <button className={styles.btnPrimary} onClick={saveOptions}>Save Options</button>
                    <button className={styles.btnSecondary} onClick={generateCombinations}>Generate Combinations →</button>
                  </div>
                )}
              </>
            )}

            {activeTab === 'variants' && combinations.length > 0 && (
              <>
                <h3>Configure Pricing & Inventory ({combinations.length} variants)</h3>
                <table className={styles.variantTable}>
                  <thead>
                    <tr>
                      <th>Options</th>
                      <th>Price</th>
                      <th>SKU</th>
                      <th>Inventory</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map((variant, index) => (
                      <tr key={index}>
                        <td>
                          {variant.options.map(opt => `${opt.name}: ${opt.value}`).join(' / ')}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={variant.price}
                            onChange={(e) => updateVariantField(index, 'price', e.target.value)}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => updateVariantField(index, 'sku', e.target.value)}
                            placeholder="SKU"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={variant.inventory_qty}
                            onChange={(e) => updateVariantField(index, 'inventory_qty', parseInt(e.target.value))}
                            placeholder="0"
                          />
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            checked={variant.is_active}
                            onChange={(e) => updateVariantField(index, 'is_active', e.target.checked)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className={styles.btnPrimary} onClick={saveVariants}>Save All Variants</button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
