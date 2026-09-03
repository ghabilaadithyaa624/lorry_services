/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@lorrycarry/database', 'three', 'three-stdlib', '@react-three/fiber', '@react-three/drei'],
  async rewrites() {
    return [
      // The client uses /api/v1 by default; keep the prefix intact when the
      // browser is running behind a preview host or reverse proxy.
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3002'}/api/v1/:path*`,
      },
      // Backwards-compatible shorthand for any existing /api/* callers.
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3002'}/api/v1/:path*`,
      },
    ]
  },
  images: {
    domains: ['localhost', 'lorrycarry.com'],
  },
}

module.exports = nextConfig
