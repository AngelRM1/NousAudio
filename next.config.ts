import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sitio 100% estático: todo el procesado ocurre en el navegador del usuario.
  // Compatible con Cloudflare Pages (export estático).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
