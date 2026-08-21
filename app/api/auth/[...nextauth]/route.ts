// app/api/auth/[...nextauth]/route.ts  (Frontend)
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // Email + Password
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        // Call backend login endpoint
        const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials.');
        }

        return {
          id: String(data.user.user_id),
          name: data.user.full_name,
          email: data.user.email,
          image: data.user.profile_picture || null,
          role: data.user.role,
        };
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  callbacks: {
    // For Google OAuth: auto-register new users via backend
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;
        try {
          // Tell the backend to register/validate this Google user
          await fetch(`${BACKEND_URL}/api/auth/google-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              full_name: user.name,
              profile_picture: user.image,
            }),
          });
          return true;
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      // For Google sign-in — fetch role from backend if not yet set
      if (!token.role && token.email) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/user-info?email=${token.email}`);
          if (res.ok) {
            const data = await res.json();
            token.id = String(data.user_id);
            token.role = data.role;
          }
        } catch {}
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
