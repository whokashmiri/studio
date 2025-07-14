
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
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**', // Allows any path from this hostname
      },
    ],
  },
  experimental: {
    // IMPORTANT: If you experience issues with Hot Module Replacement (HMR)
    // or Fast Refresh not working, ensure the URLs below match the
    // exact URL you are using to access your development environment.
    // These might change if your Firebase Studio or Cloud Workstation URL changes.
    allowedDevOrigins: [
      'https://6000-firebase-studio-1748928733161.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
      'https://9000-firebase-studio-1748928733161.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev',
    ],
  },
};

// Only enable PWA in production builds to avoid development server issues.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Disable PWA in development
  register: true,
  skipWaiting: true,
});

const finalConfig: NextConfig = process.env.NODE_ENV === 'production' 
  ? withPWA(baseNextConfig) 
  : baseNextConfig;


export default finalConfig;

