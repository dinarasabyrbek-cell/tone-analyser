import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soul Health",
    short_name: "Soul",
    description: "Your lab results, food and habits — understood.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#354024",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
