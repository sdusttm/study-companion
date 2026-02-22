import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        const note = await prisma.note.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
        });

        if (!note) {
            return NextResponse.json({ error: "Note not found or unauthorized" }, { status: 404 });
        }

        await prisma.note.delete({
            where: { id: note.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting note:", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
