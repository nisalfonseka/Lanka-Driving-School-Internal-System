import type { MetadataRoute } from "next";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Lanka Learners";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${appName} — Driving School Management`,
    short_name: "Lanka Learners",
    description:
      "Internal management system for driving school clients, training, examinations and finance.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5fb",
    theme_color: "#19398d",
    orientation: "any",
    prefer_related_applications: false,
    categories: ["business", "education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Open the staff dashboard",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Clients",
        short_name: "Clients",
        description: "Open client records",
        url: "/clients",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Payments",
        short_name: "Payments",
        description: "Open payment records",
        url: "/payments",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
