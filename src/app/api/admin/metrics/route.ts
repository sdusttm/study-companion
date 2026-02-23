import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // STRCIT SECURITY CHECK: Must be logged in AND have the ADMIN role
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch aggregate system metrics
        const totalUsers = await prisma.user.count();
        const totalBooks = await prisma.book.count();
        const totalNotes = await prisma.highlight.count();
        const totalBookmarks = await prisma.bookmark.count();
        const totalSessions = await prisma.session.count();

        // Fetch recent active data for the dashboard tables
        const recentUsers = await prisma.user.findMany({
            take: 10,
            orderBy: { id: 'desc' }, // Pseudo-chronological since CUIDs are time-based
            select: { id: true, name: true, email: true, role: true }
        });

        const recentBooks = await prisma.book.findMany({
            take: 10,
            orderBy: { uploadedAt: 'desc' },
            include: { user: { select: { email: true, name: true } } }
        });

        return NextResponse.json({
            metrics: {
                totalUsers,
                totalBooks,
                totalNotes,
                totalBookmarks,
                totalSessions
            },
            recentUsers,
            recentBooks
        });

    } catch (error: any) {
        console.error("Admin metrics error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
