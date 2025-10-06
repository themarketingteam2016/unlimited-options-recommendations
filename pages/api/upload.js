import { uploadImageToShopify } from '../../lib/shopify-client';

// Upload image to Shopify and return CDN URL
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log('Uploading image to Shopify...');

    // Upload to Shopify and get CDN URL
    const shopifyUrl = await uploadImageToShopify(image, filename || `image-${Date.now()}.jpg`);

    console.log('Image uploaded successfully:', shopifyUrl);

    res.status(200).json({ url: shopifyUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
