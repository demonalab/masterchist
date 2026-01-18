/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@himchistka/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
