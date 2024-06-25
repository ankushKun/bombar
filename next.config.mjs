/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/bombar',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
