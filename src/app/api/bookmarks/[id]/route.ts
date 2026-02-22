import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// DELETE a specific bookmark
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        // Verify ownership before deleting
        const bookmark = await prisma.bookmark.findFirst({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!bookmark) {
            return NextResponse.json({ error: "Bookmark not found or unauthorized" }, { status: 404 });
        }

        await prisma.bookmark.delete({
            where: { id: resolvedParams.id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete bookmark error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH a specific bookmark (e.g., rename)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const body = await req.json();

        if (!body.title || typeof body.title !== 'string') {
            return NextResponse.json({ error: "Invalid title" }, { status: 400 });
        }

        const bookmark = await prisma.bookmark.findFirst({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!bookmark) {
            return NextResponse.json({ error: "Bookmark not found or unauthorized" }, { status: 404 });
        }

        const updatedBookmark = await prisma.bookmark.update({
            where: { id: resolvedParams.id },
            data: { title: body.title.trim() }
        });

        return NextResponse.json({ success: true, bookmark: updatedBookmark });
    } catch (error: any) {
        console.error("Update bookmark error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
