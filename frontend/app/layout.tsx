import type { Metadata } from "next";
import {
  Fira_Code,
  Fira_Sans,
} from "next/font/google";
import "./globals.css";

const sans = Fira_Sans({ variable: "--font-active-sans", weight: ["300", "400", "500", "600", "700"], subsets: ["latin"] });
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
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
