/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'googleapis'],
  },
};

export default nextConfig;
