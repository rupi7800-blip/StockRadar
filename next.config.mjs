/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' wss://stream.binance.com:9443 wss://data-stream.binance.vision",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];
const STATIC = process.env.STATIC_EXPORT === '1';

/** Versione statica per GitHub Pages: export HTML senza server (vedi scripts/build-static.mjs). */
const nextConfig = STATIC
  ? {
      output: 'export',
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
      serverExternalPackages: ['web-push'],
    }
  : {
      reactStrictMode: true,
      poweredByHeader: false,
      serverExternalPackages: ['web-push'],
      async headers() {
        return [{ source: '/:path*', headers: securityHeaders }];
      },
    };
export default nextConfig;
