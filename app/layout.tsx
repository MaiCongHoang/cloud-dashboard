import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Fairy Sphere - Quản lý ghi chú",
  description: "Ứng dụng quản lý ghi chú trực tuyến với tính năng đồng bộ realtime",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${inter.className} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
