import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "~/styles/globals.css";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "~/components/auth-context";

export const metadata: Metadata = {
  title: "AI App Template",
  description: "AI App Template",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <SessionProvider>
          <AuthProvider>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
