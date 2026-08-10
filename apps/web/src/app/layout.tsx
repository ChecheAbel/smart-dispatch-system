import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { BrandingProvider } from "@/components/shared/providers/branding-context";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="smart-dispatch-theme";var s=localStorage.getItem(k);var t=s==="dark"||s==="light"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <BrandingProvider>
          {children}
          <ThemeToggle />
          <Toaster />
        </BrandingProvider>
      </body>
    </html>
  );
}
