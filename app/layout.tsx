import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Noto_Sans_Thai } from "next/font/google";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/footer";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { AlertProvider } from "@/lib/alert";
import { FloatingCartButton } from "@/components/cart/floating-cart-button";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap"
});

export const metadata: Metadata = {
  title: "168VAPE",
  description: "168VAPE - ร้านขายพอตและอุปกรณ์อิเล็กทรอนิกส์สำหรับสูบ"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background text-foreground flex flex-col",
          notoSansThai.className
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AlertProvider>
              <CartProvider>
                <Navbar />
                <main className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </main>
                <SiteFooter />
                <FloatingCartButton />
              </CartProvider>
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


