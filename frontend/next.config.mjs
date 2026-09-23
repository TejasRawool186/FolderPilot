/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '127.0.0.1:3000', 'localhost:3000'],
  async rewrites() {
    return [
      { source: '/fs/:path*', destination: 'http://127.0.0.1:8000/fs/:path*' },
      { source: '/workspaces/:path*', destination: 'http://127.0.0.1:8000/workspaces/:path*' },
      { source: '/workspaces', destination: 'http://127.0.0.1:8000/workspaces' },
      { source: '/jobs/:path*', destination: 'http://127.0.0.1:8000/jobs/:path*' },
      { source: '/classification/:path*', destination: 'http://127.0.0.1:8000/classification/:path*' },
      { source: '/plan/:path*', destination: 'http://127.0.0.1:8000/plan/:path*' },
      { source: '/journal/:path*', destination: 'http://127.0.0.1:8000/journal/:path*' },
      { source: '/api/:path*', destination: 'http://127.0.0.1:8000/api/:path*' },
    ];
  },
};

export default nextConfig;
