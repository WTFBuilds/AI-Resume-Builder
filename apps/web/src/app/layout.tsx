import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "AIResume — AI Resume Builder | ATS-friendly resumes in minutes",
    template: "%s · AIResume — AI Resume Builder",
  },
  description:
    "AIResume is a focused resume workspace: structured forms instead of code, a live preview that updates as you type, and pixel-perfect, ATS-ready PDF exports. A wtfbuilds product.",
  keywords: [
    "ai resume builder",
    "ats friendly resume builder",
    "free resume builder",
    "online resume maker",
    "resume builder for students",
  ],
  openGraph: {
    siteName: "AIResume",
    title: "AIResume — AI Resume Builder",
    description: "Structured forms, live preview, ATS-ready PDFs. Build a resume that gets you hired.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const themeInit = `
try {
  var stored = localStorage.getItem("airesume-theme");
  var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)" } }} />
      </body>
    </html>
  );
}
