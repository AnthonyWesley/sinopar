import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { CartDrawer } from "@/components/cart-drawer";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// variável no eixo de largura: o título usa font-stretch 125% (ver .font-wide)
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | ${site.tagline}`, template: `%s | ${site.name}` },
  description: site.description,
  openGraph: { type: "website", locale: "pt_BR", siteName: site.name },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#111111" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${archivo.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <CartDrawer />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "HardwareStore",
            name: site.name,
            description: site.description,
            url: site.url,
            logo: `${site.url}/icon.svg`,
            address: {
              "@type": "PostalAddress",
              addressLocality: site.city,
              addressRegion: site.state,
              addressCountry: "BR",
              ...(site.street ? { streetAddress: site.street } : {}),
              ...(site.postalCode ? { postalCode: site.postalCode } : {}),
            },
            ...(site.phone ? { telephone: site.phone } : {}),
            ...(site.instagram ? { sameAs: [site.instagram] } : {}),
          }}
        />
      </body>
    </html>
  );
}
