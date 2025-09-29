/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // GitHub Pages用の設定
  basePath: process.env.NODE_ENV === 'production' ? '/cs-members' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/cs-members' : '',
};

export default nextConfig;