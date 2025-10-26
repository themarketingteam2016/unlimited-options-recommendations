import Home from './index';

/**
 * Auth/Entry page for custom embedded apps
 *
 * This is the entry point when opening the app from Shopify Admin.
 * For custom apps (single store), no OAuth is needed - we just
 * render the main app interface directly within Shopify's iframe.
 */
export default function Auth() {
  // Simply render the main app - no complex initialization needed
  return <Home />;
}
