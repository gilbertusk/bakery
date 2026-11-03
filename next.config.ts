import type { NextConfig } from 'next';

const HEADER_KEAMANAN = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // bluetooth=(self) disiapkan untuk cetak struk ke printer Bluetooth (R3).
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), bluetooth=(self)',
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: HEADER_KEAMANAN }];
  },
};

export default nextConfig;
