import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@airesume/db";

/**
 * Transactional email. Production wires SES here (plan §17); local dev
 * prints links to the server console so flows stay testable offline.
 */
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.SES_FROM_ADDRESS) {
    // P2: SESv2 client send. Kept explicit so the seam is obvious.
    throw new Error("SES transport not wired yet (plan.md Phase 2)");
  }
  console.log("\n────────── 📧 airesume dev email ───────────");
  console.log(`To: ${to}\nSubject: ${subject}\n${body}`);
  console.log("─────────────────────────────────────────────\n");
}

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
    : {}),
};

export const auth = betterAuth({
  appName: "AIResume",
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Reset your AIResume password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: true, // the link lands in the dev console (see sendEmail)
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your AIResume email", url);
    },
  },
  socialProviders,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = Session["user"];
