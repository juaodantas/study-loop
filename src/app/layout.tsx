import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "study-loop",
  description: "Sessão diária de estudo pra evitar atrofia cognitiva",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b px-4 py-3 text-sm">
          <div className="mx-auto flex max-w-2xl gap-4">
            <Link href="/" className="font-medium">
              study-loop
            </Link>
            <Link href="/topics" className="text-muted-foreground hover:text-foreground">
              Temas
            </Link>
            <Link href="/review" className="text-muted-foreground hover:text-foreground">
              Revisão
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
