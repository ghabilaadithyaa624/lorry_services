/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  transpilePackages: ['@lorrycarry/database', 'three', 'three-stdlib', '@react-three/fiber', '@react-three/drei'],
  async rewrites() {
    return [
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
