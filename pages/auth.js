import Dashboard from './dashboard';

/**
 * Auth/Entry page for custom embedded apps
 *
 * This is the entry point when opening the app from Shopify Admin.
 * For custom apps (single store), no OAuth is needed - we just
 * render the dashboard directly within Shopify's iframe.
 */
export default function Auth() {
  // Render the dashboard as the default landing page
  return <Dashboard />;
}
