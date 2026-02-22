import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    secret: process.env.AUTH_SECRET || "a-very-secure-secret-key-for-local-development",
    debug: true,
    logger: {
        error(error) {
            try {
                const fs = require('fs');
                let details = error instanceof Error ? (error.stack || error.message) : JSON.stringify(error);
                if (error?.cause) details += '\\nCause: ' + (error.cause instanceof Error ? error.cause.stack : JSON.stringify(error.cause));
                fs.appendFileSync('nextauth-error.log', `[ERROR] ${details}\\n`);
            } catch (e) { }
            console.error(error);
        },
        warn(code, ...message) {
            console.warn(code, ...message);
        },
        debug(code, ...message) {
            console.log(code, ...message);
        }
    },
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password as string, user.password);

                if (!isValid) {
                    return null;
                }

                return user;
            }
        })
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;

                // Fetch fresh role from DB or auto-promote if in ADMIN_EMAILS
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
                let role = dbUser?.role || "USER";

                const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [];
                if (user.email && adminEmails.includes(user.email.toLowerCase()) && role !== "ADMIN") {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { role: "ADMIN" }
                    });
                    role = "ADMIN";
                }

                token.role = role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        }
    }
});

// Backwards compatibility wrapper for the rest of the application
export const getServerSession = async (...args: any[]) => {
    return await auth();
};
export const authOptions = {};
