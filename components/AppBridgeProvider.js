/**
 * Simple App Bridge Provider for embedded Shopify apps
 * For custom apps, we don't need complex App Bridge features
 * Just render children - the app will work inside Shopify's iframe
 */
export function AppBridgeProvider({ children }) {
  // For custom embedded apps, just render children
  // The iframe context is enough for basic functionality
  return <>{children}</>;
}
