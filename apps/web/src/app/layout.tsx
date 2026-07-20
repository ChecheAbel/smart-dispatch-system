import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BrandingProvider } from "@/components/shared/providers/branding-context";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Dispatch | Premium Mobility Platform",
  description: "All-in-one platform for booking, dispatch, fleet management, driver management, billing, and invoicing.",
  icons: {
    icon: "/logo.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BrandingProvider>
          {children}
          <Toaster />
        </BrandingProvider>
      </body>
    </html>
  );
}
