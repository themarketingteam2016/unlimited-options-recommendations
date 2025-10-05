// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import {
  createProductOptions,
  getProductOptions,
  generateCombinations,
  saveVariantCombinations,
  getVariantCombinations,
  saveVariantToMetafield
} from "./options-controller.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Log ALL requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json());

// Root route - NO middleware to test
app.get("/", async (req, res) => {
  console.log('=== ROOT REQUEST RECEIVED ===');
  console.log('Query params:', req.query);

  return res
    .status(200)
    .set("Content-Type", "text/plain")
    .set("Content-Security-Policy", "frame-ancestors https://*.myshopify.com https://admin.shopify.com;")
    .send('SUCCESS! App is responding. Shop: ' + req.query.shop);
});

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  (req, res) => {
    console.log('Auth callback - redirecting to root');
    res.redirect('/');
  }
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// Get all products from Shopify
app.get("/api/products", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });

    const response = await client.request(`
      query getProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              status
              featuredImage {
                url
              }
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
              }
            }
          }
        }
      }
    `);

    res.status(200).json(response.data.products.edges.map(edge => edge.node));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/Update product options
app.post("/api/options/create", async (req, res) => {
  try {
    const { productId, options } = req.body;
    const shop = res.locals.shopify.session.shop;

    await createProductOptions(shop, productId, options);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to create options:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product options
app.get("/api/options/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const shop = res.locals.shopify.session.shop;

    const options = await getProductOptions(shop, productId);
    res.status(200).json(options);
  } catch (error) {
    console.error('Failed to get options:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate combinations
app.post("/api/options/generate-combinations", async (req, res) => {
  try {
    const { options } = req.body;
    const combinations = generateCombinations(options);
    res.status(200).json(combinations);
  } catch (error) {
    console.error('Failed to generate combinations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save variant combinations with pricing
app.post("/api/variants/save", async (req, res) => {
  try {
    const { productId, variants } = req.body;
    const shop = res.locals.shopify.session.shop;

    await saveVariantCombinations(shop, productId, variants);

    // Also save to Shopify metafields
    await saveVariantToMetafield(shopify, res.locals.shopify.session, productId, variants);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to save variants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get variant combinations
app.get("/api/variants/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const shop = res.locals.shopify.session.shop;

    const variants = await getVariantCombinations(shop, productId);
    res.status(200).json(variants);
  } catch (error) {
    console.error('Failed to get variants:', error);
    res.status(500).json({ error: error.message });
  }
});

// Catch all OTHER routes
app.get("*", async (req, res) => {
  console.log('=== CATCH ALL ===');
  console.log('Path:', req.path);
  res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log('=====================================');
  console.log(`Server listening on port ${PORT}`);
  console.log('=====================================');
});
