import "./globals.css";
import { ReactNode } from "react";
import { EnvScript } from "./env-script";

export const metadata = {
  title: "Gold Price Dashboard",
  description: "Real-time gold price monitoring and analytics",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <EnvScript />
      </head>
      <body className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen">
        <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Gold Price Dashboard</h1>
                  <p className="text-sm text-slate-400">Real-time market price data</p>
                </div>
              </div>
              <div id="last-update-container"></div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-4">{children}</main>
      </body>
    </html>
  );
}

