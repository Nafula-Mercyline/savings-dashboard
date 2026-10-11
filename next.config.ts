import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['decorated-cough-external.ngrok-free.dev'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;