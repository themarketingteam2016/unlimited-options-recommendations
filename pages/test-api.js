export default function TestAPI() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Endpoint Test</h1>
      <p>Testing new API structure:</p>
      <ul>
        <li><a href="/api/products" target="_blank">/api/products</a></li>
        <li><a href="/api/variants?productId=test" target="_blank">/api/variants?productId=test</a></li>
        <li><a href="/api/recommendations?productId=test" target="_blank">/api/recommendations?productId=test</a></li>
      </ul>
      <hr />
      <h2>Clear Cache Instructions:</h2>
      <p><strong>Windows/Linux:</strong> Ctrl + Shift + Delete → Clear all cached images and files</p>
      <p><strong>Mac:</strong> Cmd + Shift + Delete → Clear all cached images and files</p>
      <p><strong>Or use Incognito/Private mode</strong></p>
      <hr />
      <p><a href="/">← Back to Home</a></p>
    </div>
  );
}
