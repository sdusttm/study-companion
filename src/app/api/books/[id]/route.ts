import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const book = await prisma.book.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        return NextResponse.json(book);
    } catch (error) {
        console.error("Error fetching book:", error);
        return NextResponse.json({ error: "Failed to fetch book" }, { status: 500 });
    }
}
