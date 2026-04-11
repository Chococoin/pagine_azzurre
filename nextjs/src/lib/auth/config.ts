import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/mongoose';
import UserModel from '@/lib/db/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e password richiesti');
        }

        await connectDB();

        const user = await UserModel.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error('Email o password non validi');
        }

        const isPasswordValid = bcrypt.compareSync(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Email o password non validi');
        }

        if (!user.verify.verified) {
          throw new Error('Account non verificato. Controlla la tua email.');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          isAdmin: user.isAdmin,
          isSeller: user.isSeller,
          hasAd: user.hasAd,
          account: user.account,
          sellerName: user.seller.name,
        };
      },
    }),
    CredentialsProvider({
      // Used right after a successful email verification: the verification
      // API generates a one-shot loginToken on the user document and the
      // client exchanges it here for a real NextAuth session. The token is
      // cleared atomically so it cannot be reused.
      id: 'verification-autologin',
      name: 'Verification Auto Login',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) {
          throw new Error('Token di verifica mancante');
        }

        await connectDB();

        // Atomically consume the one-shot loginToken and return the prior
        // document so we can issue a session for it.
        const user = await UserModel.findOneAndUpdate(
          { loginToken: credentials.token },
          { $unset: { loginToken: '' } },
          { new: false }
        );

        if (!user) {
          throw new Error('Token di verifica non valido o già utilizzato');
        }

        if (!user.verify?.verified) {
          throw new Error('Account non verificato');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.username,
          isAdmin: user.isAdmin,
          isSeller: user.isSeller,
          hasAd: user.hasAd,
          account: user.account,
          sellerName: user.seller.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.isSeller = user.isSeller;
        token.hasAd = user.hasAd;
        token.account = user.account;
        token.sellerName = user.sellerName;
      }

      // When the client calls useSession().update(), NextAuth invokes the
      // JWT callback with trigger='update' so we can re-sync mutable flags
      // from the database (e.g. hasAd after the seller publishes their
      // first product). We avoid re-reading on every request to keep the
      // hot path cheap.
      if (trigger === 'update' && token.id) {
        try {
          await connectDB();
          const fresh = await UserModel.findById(token.id).lean<{
            isAdmin?: boolean;
            isSeller?: boolean;
            hasAd?: boolean;
            seller?: { name?: string };
          }>();
          if (fresh) {
            token.isAdmin = fresh.isAdmin ?? token.isAdmin;
            token.isSeller = fresh.isSeller ?? token.isSeller;
            token.hasAd = fresh.hasAd ?? token.hasAd;
            token.sellerName = fresh.seller?.name ?? token.sellerName;
          }
        } catch (err) {
          console.error('[auth] jwt update refresh failed:', err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isSeller = token.isSeller as boolean;
        session.user.hasAd = token.hasAd as boolean;
        session.user.account = token.account as string;
        session.user.sellerName = token.sellerName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
