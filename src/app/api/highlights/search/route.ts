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
        const query = searchParams.get("q") || "";

        const whereClause: any = {
            userId: (session.user as any).id,
        };

        if (query) {
            whereClause.OR = [
                { content: { contains: query, mode: 'insensitive' } },
                { comment: { contains: query, mode: 'insensitive' } },
            ];
        }

        const highlights = await prisma.highlight.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            include: {
                book: { select: { title: true } }
            }
        });

        return NextResponse.json(highlights);

    } catch (error: any) {
        console.error("Search highlights error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
