export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Register service worker in production builds so offline PWA caching activates cleanly.
  if (import.meta.env.DEV) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error: unknown) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
