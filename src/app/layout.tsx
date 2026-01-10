import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Blackjack Online - Real-time Multiplayer",
  description: "Play blackjack with friends in real-time. 6 seats, spectator mode, and persistent chip balances.",
  icons: {
    icon: "/favicon.ico",
  },
};

// Error Boundary for client-side errors
function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#061a10] text-white p-6">
      <h2 className="text-xl font-bold text-amber-400 mb-4">Something went wrong</h2>
      <p className="text-white/60 mb-6 text-center max-w-md">{error.message || "An unexpected error occurred"}</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold rounded-xl"
      >
        Try Again
      </button>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

// Export error boundary for Next.js error handling
export { GlobalError as ErrorBoundary };
