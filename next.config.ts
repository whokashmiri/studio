
import type {NextConfig} from 'next';

const baseNextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      'https://6000-firebase-studio-1748928733161.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
      'https://9000-firebase-studio-1748928733161.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
    ],
  },
};

let finalConfig: NextConfig = baseNextConfig;

// Apply PWA configuration only if:
// 1. It's a production build (NODE_ENV === 'production')
// 2. Or, it's a development build AND Turbopack is NOT being used.
const isTurbopackActive = process.env.TURBOPACK === '1';

if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV === 'development' && !isTurbopackActive)) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    // next-pwa's own `disable` option handles disabling its runtime features during development,
    // but this conditional application ensures the webpack wrapper isn't present for Turbopack dev.
    disable: process.env.NODE_ENV === 'development',
  });
  finalConfig = withPWA(baseNextConfig);
}

export default finalConfig;
