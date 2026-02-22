import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const query = searchParams.get("q");
        const globalSearch = searchParams.get("global") === "true";

        if (!query) {
            return NextResponse.json([]);
        }

        const isAdmin = (session.user as any).role === "ADMIN";
        const isGlobal = isAdmin && globalSearch;

        const whereClause: any = {
            OR: [
                { content: { contains: query } },
                { paragraphContext: { contains: query } },
                { content: { contains: query, mode: 'insensitive' } }, // Add case-insensitive search if supported by DB
                { paragraphContext: { contains: query, mode: 'insensitive' } },
            ],
        };

        if (!isGlobal) {
            whereClause.userId = (session.user as any).id;
        }

        const notes = await prisma.note.findMany({
            where: whereClause,
            include: {
                book: {
                    select: {
                        title: true,
                    }
                },
                ...(isGlobal && { user: { select: { email: true } } })
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error searching notes:", error);
        return NextResponse.json({ error: "Failed to search notes" }, { status: 500 });
    }
}
