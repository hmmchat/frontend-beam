import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'f005.backblazeb2.com',
      },
      {
        protocol: 'https',
        hostname: 'aiofhtheworlsgif.s3.us-east-005.backblazeb2.com',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
    ],
  },
};

export default nextConfig;
