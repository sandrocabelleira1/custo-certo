import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/auth-provider";
import AppSidebar from "@/components/app-sidebar";
import { StoreProvider } from "@/components/auth/store-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { FirebaseErrorListener } from "@/components/firebase-error-listener";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Custo Certo - Gestão Inteligente",
  description: "Plataforma de gestão gastronômica focada em controle de CMV e eficiência operacional.",
  icons: {
    icon: [
      {
        url: "https://firebasestorage.googleapis.com/v0/b/custocerto-vi1a8.firebasestorage.app/o/ChatGPT%20Image%208_06_2026%2C%2016_57_28.png?alt=media&token=13cfd52f-5ffb-4c84-9512-fc38066d0b20",
        href: "https://firebasestorage.googleapis.com/v0/b/custocerto-vi1a8.firebasestorage.app/o/ChatGPT%20Image%208_06_2026%2C%2016_57_28.png?alt=media&token=13cfd52f-5ffb-4c84-9512-fc38066d0b20",
      },
    ],
    apple: [
       {
        url: "https://firebasestorage.googleapis.com/v0/b/custocerto-vi1a8.firebasestorage.app/o/ChatGPT%20Image%208_06_2026%2C%2016_57_28.png?alt=media&token=13cfd52f-5ffb-4c84-9512-fc38066d0b20",
        href: "https://firebasestorage.googleapis.com/v0/b/custocerto-vi1a8.firebasestorage.app/o/ChatGPT%20Image%208_06_2026%2C%2016_57_28.png?alt=media&token=13cfd52f-5ffb-4c84-9512-fc38066d0b20",
      },
    ]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <StoreProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                        <SidebarTrigger />
                    </header>
                    <main className="flex-1 p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </SidebarInset>
              </SidebarProvider>
            </StoreProvider>
          </AuthProvider>
          <FirebaseErrorListener />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
