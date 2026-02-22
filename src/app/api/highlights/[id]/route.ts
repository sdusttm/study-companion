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

        const highlight = await prisma.highlight.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
        });

        if (!highlight) {
            return NextResponse.json({ error: "Highlight not found or unauthorized" }, { status: 404 });
        }

        await prisma.highlight.delete({
            where: { id: highlight.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting highlight:", error);
        return NextResponse.json({ error: "Failed to delete highlight" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const body = await req.json();
        const { comment } = body;

        const highlight = await prisma.highlight.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
        });

        if (!highlight) {
            return NextResponse.json({ error: "Highlight not found or unauthorized" }, { status: 404 });
        }

        const updatedHighlight = await prisma.highlight.update({
            where: { id: highlight.id },
            data: { comment }
        });

        return NextResponse.json(updatedHighlight);
    } catch (error) {
        console.error("Error updating highlight:", error);
        return NextResponse.json({ error: "Failed to update highlight" }, { status: 500 });
    }
}
