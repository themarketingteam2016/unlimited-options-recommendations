// Shopify Admin API client
export const shopifyAdmin = {
  async request(query, options = {}) {
    const shop = 'unlimited-options-recommendations.myshopify.com';
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

    console.log('[shopifyAdmin] Request initiated');
    console.log('[shopifyAdmin] Has access token:', !!accessToken);

    try {
      const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query,
          variables: options.variables || {}
        }),
      });

      console.log('[shopifyAdmin] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[shopifyAdmin] Error response:', errorText);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error('[shopifyAdmin] GraphQL errors:', data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      console.log('[shopifyAdmin] Request successful');
      return { data: data.data };
    } catch (error) {
      console.error('[shopifyAdmin] Request failed:', error.message);
      throw error;
    }
  }
};

// Upload image to Shopify using GraphQL API and return the CDN URL
export async function uploadImageToShopify(base64Image, filename = 'product-image.jpg') {
  const shop = 'unlimited-options-recommendations.myshopify.com';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

  try {
    // Extract base64 data and convert to buffer
    const base64Data = base64Image.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Step 1: Create staged upload target
    const stagedUploadQuery = `
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters {
              name
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const stagedResponse = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: stagedUploadQuery,
        variables: {
          input: [{
            resource: 'IMAGE',
            filename: filename,
            mimeType: base64Image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg',
            httpMethod: 'POST'
          }]
        }
      }),
    });

    const stagedData = await stagedResponse.json();

    if (stagedData.data?.stagedUploadsCreate?.userErrors?.length > 0) {
      throw new Error(`Staged upload error: ${stagedData.data.stagedUploadsCreate.userErrors[0].message}`);
    }

    const stagedTarget = stagedData.data.stagedUploadsCreate.stagedTargets[0];

    // Step 2: Upload file to staged URL using multipart form data
    const FormData = (await import('formdata-node')).FormData;
    const { Blob } = await import('buffer');

    const formData = new FormData();

    // Add all parameters from Shopify
    stagedTarget.parameters.forEach(param => {
      formData.append(param.name, param.value);
    });

    // Add the file
    formData.append('file', new Blob([buffer]), filename);

    await fetch(stagedTarget.url, {
      method: 'POST',
      body: formData,
    });

    // Step 3: Create the file in Shopify
    const fileCreateQuery = `
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            ... on MediaImage {
              id
              image {
                url
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const fileResponse = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: fileCreateQuery,
        variables: {
          files: [{
            alt: filename,
            contentType: 'IMAGE',
            originalSource: stagedTarget.resourceUrl
          }]
        }
      }),
    });

    const fileData = await fileResponse.json();

    if (fileData.data?.fileCreate?.userErrors?.length > 0) {
      throw new Error(`File create error: ${fileData.data.fileCreate.userErrors[0].message}`);
    }

    const file = fileData.data.fileCreate.files[0];
    const imageUrl = file.image?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Shopify');
    }

    return imageUrl;
  } catch (error) {
    console.error('Failed to upload image to Shopify:', error);
    // For now, fallback to returning the base64 if Shopify upload fails
    // This ensures the app doesn't break
    console.warn('Falling back to base64 storage');
    return base64Image;
  }
}

// Shopify Admin API client for fetching products
export async function fetchShopifyProducts() {
  const shop = 'unlimited-options-recommendations.myshopify.com';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

  const query = `
    query getProducts {
      products(first: 250) {
        edges {
          node {
            id
            title
            handle
            description
            status
            featuredImage {
              url
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price
                  sku
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data.products.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Failed to fetch Shopify products:', error);
    throw error;
  }
}

// Alternative: Fetch using REST API
export async function fetchShopifyProductsREST() {
  const shop = 'unlimited-options-recommendations.myshopify.com';
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || process.env.SHOPIFY_API_SECRET;

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=250`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to match GraphQL format
    return data.products.map(product => ({
      id: `gid://shopify/Product/${product.id}`,
      title: product.title,
      handle: product.handle,
      description: product.body_html,
      status: product.status.toUpperCase(),
      featuredImage: product.image ? { url: product.image.src } : null,
      variants: product.variants.map(v => ({
        id: `gid://shopify/ProductVariant/${v.id}`,
        title: v.title,
        price: v.price,
        sku: v.sku,
        inventoryQuantity: v.inventory_quantity,
      })),
    }));
  } catch (error) {
    console.error('Failed to fetch Shopify products (REST):', error);
    throw error;
  }
}
