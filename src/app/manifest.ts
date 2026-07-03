import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: "Casa Amor",
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/icon-512-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
