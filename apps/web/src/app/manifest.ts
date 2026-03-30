import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Restaurant Menu SaaS",
    short_name: "Menu SaaS",
    description: "QR guest ordering, kitchen boards, waiter workflow, and admin tooling for restaurants.",
    start_url: "/waiter/harbor-bistro",
    display: "standalone",
    background_color: "#f5efe6",
    theme_color: "#183b4e",
    icons: [],
  };
}
