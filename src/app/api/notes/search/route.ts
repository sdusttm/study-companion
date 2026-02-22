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

        if (!query) {
            return NextResponse.json([]);
        }

        const notes = await prisma.note.findMany({
            where: {
                userId: (session.user as any).id,
                OR: [
                    { content: { contains: query } },
                    { paragraphContext: { contains: query } },
                    { content: { contains: query, mode: 'insensitive' } },
                    { paragraphContext: { contains: query, mode: 'insensitive' } },
                ],
            },
            include: {
                book: {
                    select: {
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error searching notes:", error);
        return NextResponse.json({ error: "Failed to search notes" }, { status: 500 });
    }
}
