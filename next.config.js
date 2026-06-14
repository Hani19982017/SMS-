/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // السماح للحزم الخادمية بالعمل داخل API routes
  experimental: { serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'] },
};
module.exports = nextConfig;
