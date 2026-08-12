import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Profile photos are validated at 5 MB. The extra room covers multipart
    // form-data overhead before the Server Action reaches that validator.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
