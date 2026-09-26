import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "archive.org" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "standardebooks.org" },
      { protocol: "https", hostname: "images.unsplash.com" }
    ],
  },
};

export default nextConfig;
