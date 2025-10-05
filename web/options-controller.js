import { getDB } from './database.js';

// Generate all combinations from options
export function generateCombinations(options) {
  if (!options || options.length === 0) return [];

  function cartesian(arrays) {
    return arrays.reduce((acc, array) => {
      return acc.flatMap(x => array.map(y => [...x, y]));
    }, [[]]);
  }

  const valueArrays = options.map(opt =>
    opt.values.map(val => ({ name: opt.name, value: val }))
  );

  return cartesian(valueArrays);
}

// Create product options
export async function createProductOptions(shop, productId, options) {
  const db = await getDB();

  // Delete existing options for this product
  await db.run(
    'DELETE FROM product_options WHERE shop = ? AND product_id = ?',
    [shop, productId]
  );

  // Insert new options
  for (const option of options) {
    const result = await db.run(
      'INSERT INTO product_options (shop, product_id, option_name) VALUES (?, ?, ?)',
      [shop, productId, option.name]
    );

    const optionId = result.lastID;

    // Insert option values
    for (const value of option.values) {
      await db.run(
        'INSERT INTO option_values (option_id, value) VALUES (?, ?)',
        [optionId, value]
      );
    }
  }

  return { success: true };
}

// Get product options
export async function getProductOptions(shop, productId) {
  const db = await getDB();

  const options = await db.all(
    'SELECT * FROM product_options WHERE shop = ? AND product_id = ?',
    [shop, productId]
  );

  for (const option of options) {
    const values = await db.all(
      'SELECT value FROM option_values WHERE option_id = ?',
      [option.id]
    );
    option.values = values.map(v => v.value);
  }

  return options;
}

// Save variant combinations with pricing
export async function saveVariantCombinations(shop, productId, variants) {
  const db = await getDB();

  // Begin transaction
  await db.run('BEGIN TRANSACTION');

  try {
    for (const variant of variants) {
      const combinationKey = variant.options
        .map(opt => `${opt.name}:${opt.value}`)
        .sort()
        .join('|');

      // Insert or update variant
      const result = await db.run(`
        INSERT INTO variant_combinations
        (shop, product_id, combination_key, price, sku, inventory_qty, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(shop, product_id, combination_key)
        DO UPDATE SET
          price = excluded.price,
          sku = excluded.sku,
          inventory_qty = excluded.inventory_qty,
          is_active = excluded.is_active
      `, [
        shop,
        productId,
        combinationKey,
        variant.price || 0,
        variant.sku || '',
        variant.inventory_qty || 0,
        variant.is_active !== false ? 1 : 0
      ]);

      const variantId = result.lastID || (await db.get(
        'SELECT id FROM variant_combinations WHERE shop = ? AND product_id = ? AND combination_key = ?',
        [shop, productId, combinationKey]
      )).id;

      // Delete old option values for this variant
      await db.run(
        'DELETE FROM variant_option_values WHERE variant_id = ?',
        [variantId]
      );

      // Insert option values for this variant
      for (const opt of variant.options) {
        await db.run(
          'INSERT INTO variant_option_values (variant_id, option_name, option_value) VALUES (?, ?, ?)',
          [variantId, opt.name, opt.value]
        );
      }
    }

    await db.run('COMMIT');
    return { success: true };
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

// Get variant combinations for a product
export async function getVariantCombinations(shop, productId) {
  const db = await getDB();

  const variants = await db.all(
    'SELECT * FROM variant_combinations WHERE shop = ? AND product_id = ? ORDER BY id',
    [shop, productId]
  );

  for (const variant of variants) {
    const options = await db.all(
      'SELECT option_name as name, option_value as value FROM variant_option_values WHERE variant_id = ?',
      [variant.id]
    );
    variant.options = options;
  }

  return variants;
}

// Create Shopify metafields to store variant data
export async function saveVariantToMetafield(shopify, session, productId, variantData) {
  const client = new shopify.api.clients.Graphql({ session });

  const mutation = `
    mutation CreateMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [{
      ownerId: `gid://shopify/Product/${productId}`,
      namespace: "unlimited_options",
      key: "variants_data",
      value: JSON.stringify(variantData),
      type: "json"
    }]
  };

  const response = await client.request(mutation, { variables });
  return response;
}
