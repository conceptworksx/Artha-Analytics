import type { Metadata } from "next";
import {
  Fira_Code,
  Inter,
} from "next/font/google";
import "./globals.css";

const sans = Inter({ variable: "--font-active-sans", subsets: ["latin"] });
const mono = Fira_Code({ variable: "--font-active-mono", weight: ["400", "500", "600", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Artha Analytics",
  description: "AI-powered equity analytics for Indian markets",
  icons: {
    icon: "/icon.png",
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
      className={`${sans.variable} ${mono.variable} h-full antialiased print:h-auto print:overflow-visible`}
    >
      <body className="min-h-full flex flex-col print:block print:h-auto print:min-h-0 print:overflow-visible">{children}</body>
    </html>
  );
}
