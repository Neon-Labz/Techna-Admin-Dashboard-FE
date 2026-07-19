import type { NextConfig } from "next";

const nextConfig:NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
       {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',

      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
        {
        protocol: 'https',
        hostname: 'placehold.net',
        pathname: '/**',
      },

      {
          protocol: 'https',
          hostname: 'pub-99e17fed1d7345978ebaceb328549b8f.r2.dev',
          pathname: '/**',
        }
    ],
  },

};

export default nextConfig;