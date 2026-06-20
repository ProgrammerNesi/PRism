import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "github" && profile) {
        const githubProfile = profile as {
          id: number;
          avatar_url: string;
          login: string;
        };
        await prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: String(githubProfile.id),
            avatarUrl: githubProfile.avatar_url,
            image: githubProfile.avatar_url,
          },
        });
      }
    },
  },
  pages: {
    signIn: "/",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };