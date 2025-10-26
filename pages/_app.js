import '../styles/globals.css';
import { AppBridgeProvider } from '../components/AppBridgeProvider';

/**
 * Root App component
 * Wraps all pages with App Bridge for embedded Shopify admin experience
 */
function MyApp({ Component, pageProps }) {
  return (
    <AppBridgeProvider>
      <Component {...pageProps} />
    </AppBridgeProvider>
  );
}

export default MyApp;
