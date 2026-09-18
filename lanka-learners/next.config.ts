import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip responses from the Node server (a CDN such as Vercel's edge also
  // compresses and caches static assets in front of it).
  compress: true,
  // Don't advertise the framework in response headers.
  poweredByHeader: false,
  images: {
    // Profile photos are served resized and as AVIF/WebP by the image
    // optimizer, instead of the full original upload.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        // Public images rarely change: let browsers and the CDN keep them for a
        // day and refresh in the background after that.
        source: "/:file(logo\\.png|login-hero\\.jpg|favicon\\.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  experimental: {
    // Profile photos are validated at 5 MB. The extra room covers multipart
    // form-data overhead before the Server Action reaches that validator.
    serverActions: {
      bodySizeLimit: "8mb",
    },
    // Tree-shake these packages so pages only ship the pieces they import.
    optimizePackageImports: ["recharts", "@base-ui/react"],
  },
};

export default nextConfig;
