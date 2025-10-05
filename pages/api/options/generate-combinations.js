import { generateCombinations } from '../../../web/options-controller.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { options } = req.body;
    const combinations = generateCombinations(options);
    res.status(200).json(combinations);
  } catch (error) {
    console.error('Failed to generate combinations:', error);
    res.status(500).json({ error: error.message });
  }
}
