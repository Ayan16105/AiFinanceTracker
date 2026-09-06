import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'J.A.R.V.I.S. Financial Terminal',
    short_name: 'J.A.R.V.I.S.',
    description: 'Autonomous AI Financial Butler & Wealth Ledger',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#070d1e',
    theme_color: '#070d1e',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    categories: ['finance', 'productivity', 'business'],
  };
}
