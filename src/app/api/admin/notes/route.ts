import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // STRICT SECURITY CHECK
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q") || "";

        // If a query is provided, search globally. Otherwise, return the latest notes feed.
        const whereClause: any = query ? {
            OR: [
                { content: { contains: query, mode: 'insensitive' } },
                { paragraphContext: { contains: query, mode: 'insensitive' } },
            ]
        } : {};

        const notes = await prisma.note.findMany({
            where: whereClause,
            take: 50, // Limit to 50 for performance
            orderBy: { createdAt: "desc" },
            include: {
                book: { select: { title: true } },
                user: { select: { email: true, name: true } }
            }
        });

        return NextResponse.json(notes);

    } catch (error: any) {
        console.error("Admin notes error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
