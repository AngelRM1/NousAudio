import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NousAudio — por NousLogic",
  description:
    "NousAudio, editor de audio en el navegador: recorta, renombra, procesa por lote y convierte audio a video. Tus archivos nunca salen de tu dispositivo. La razón ordena el cosmos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Antes del primer pintado: marca el html en móvil para que el CSS
            oculte la rama de escritorio y no se vea un instante antes del
            acordeón. Se sincroniza luego con matchMedia en page.tsx. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.matchMedia('(max-width: 1023px)').matches){document.documentElement.classList.add('na-mobile')}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
