import { supabaseAdmin } from '../../../lib/supabase';
import { handleCors } from '../../../lib/cors';

async function deleteRecommendationHandler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        error: 'Recommendation id is required'
      });
    }

    // Delete recommendation
    const { error } = await supabaseAdmin
      .from('product_recommendations')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.status(200).json({ success: true, message: 'Recommendation deleted successfully' });
  } catch (error) {
    console.error('Failed to delete recommendation:', error);
    res.status(500).json({ error: error.message });
  }
}

export default function handler(req, res) {
  return handleCors(req, res, deleteRecommendationHandler);
}
