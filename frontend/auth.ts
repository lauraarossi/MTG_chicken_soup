import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${BACKEND}/api/users/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { id: String(data.user_id), email: data.email, name: data.name, accessToken: data.access_token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Credentials sign-in: user object carries the backend token
      if (user?.accessToken) {
        token.accessToken = user.accessToken as string;
        token.userId = user.id;
      }
      // Google OAuth sign-in: sync with backend to get a backend token
      if (account?.provider === "google" && profile) {
        const gProfile = profile as { sub: string; email: string; name?: string };
        try {
          const res = await fetch(`${BACKEND}/api/users/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ google_id: gProfile.sub, email: gProfile.email, name: gProfile.name, avatar: (profile as any).picture ?? null }),
          });
          if (res.ok) {
            const data = await res.json();
            token.accessToken = data.access_token;
            token.userId = String(data.user_id);
          }
        } catch {
          // token remains without accessToken; auth will fail gracefully
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
