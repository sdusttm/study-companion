import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { lastPage } = await req.json();

        if (typeof lastPage !== 'number' || lastPage < 1) {
            return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
        }

        // Verify ownership and update the lastPage
        const book = await prisma.book.findFirst({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        await prisma.book.update({
            where: { id: resolvedParams.id },
            data: { lastPage }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Progress update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
