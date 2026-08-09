/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  transpilePackages: ['@lorrycarry/database'],
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
