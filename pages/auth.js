import Home from './index';

/**
 * Auth page for custom apps (single store)
 * No OAuth needed - just renders the main app directly
 *
 * Shopify always redirects to /auth when opening embedded apps,
 * so we render the main app here instead of redirecting.
 */
export default function Auth() {
  return <Home />;
}
