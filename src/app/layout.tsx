import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "~/styles/globals.css";
import { Providers } from "~/components/providers";

export const metadata: Metadata = {
  title: "AI App Template",
  description: "AI App Template",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="flex h-screen flex-col antialiased">
        <Providers>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
