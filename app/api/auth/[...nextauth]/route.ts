// app/api/auth/[...nextauth]/route.ts  (Frontend)
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID || '').trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || '').trim(),
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

        // --- LOCAL DEVELOPMENT BYPASS ---
        // Allows testing roles instantly from the UI when backend is offline
        if (credentials.email === 'teacher@bracu.ac.bd' && credentials.password === 'teacher') {
          return { id: "101", name: "Dr. Sarah Chen", email: credentials.email, role: "teacher" };
        }
        if (credentials.email === 'admin@bracu.ac.bd' && credentials.password === 'admin') {
          return { id: "999", name: "Super Admin", email: credentials.email, role: "admin" };
        }
        if (credentials.email === 'student@bracu.ac.bd' && credentials.password === 'student') {
          return { id: "202", name: "Arian Kabir", email: credentials.email, role: "student" };
        }
        // --------------------------------

        try {
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
        } catch (err: any) {
          throw new Error(err.message || 'Authentication failed (backend offline?). Try using test credentials: teacher@bracu.ac.bd / teacher');
        }
      },
    }),
  ],

  secret: (process.env.NEXTAUTH_SECRET || '9f8c4e2b7a1d5f3e8b0a2c4e6d8f1a3b5c7e9a0d2f4b6a8c1e3d5f7a9b0c2e4').trim(),

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;
        try {
          await fetch(`${BACKEND_URL}/api/auth/google-signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              full_name: user.name,
              profile_picture: user.image,
            }),
          });
        } catch {
          // Graceful fallback for decoupled frontend preview
        }
        return true;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role || 'student';
      }
      if (!token.role && token.email) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/user-info?email=${token.email}`);
          if (res.ok) {
            const data = await res.json();
            token.id = String(data.user_id);
            token.role = data.role;
          }
        } catch {
          token.role = 'student';
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role || 'student';
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
