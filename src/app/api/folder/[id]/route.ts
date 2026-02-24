import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const prisma = new PrismaClient();
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        // Verify folder exists and belongs to user
        const folder = await prisma.folder.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
            include: {
                books: true,
            }
        });

        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        // Avoid deleting actual physical files directly for now. Follow the book delete convention.
        // We let Prisma cascade delete the books, and we don't attempt to delete files.
        // If necessary, a separate cleanup job can delete files from S3/Supabase storage later.

        // Delete the folder record (books deleted by cascade)
        await prisma.folder.delete({
            where: {
                id: resolvedParams.id,
            },
        });

        logActivity(req, 'DELETE_FOLDER', folder.name);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting folder:", error);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const resolvedParams = await params;
        const folderId = resolvedParams.id;

        const body = await req.json();
        const { name } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: "Valid folder name is required" }, { status: 400 });
        }

        // Verify folder exists and belongs to user
        const existingFolder = await prisma.folder.findUnique({
            where: {
                id: folderId,
                userId: userId,
            },
        });

        if (!existingFolder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        const updatedFolder = await prisma.folder.update({
            where: { id: folderId },
            data: { name: name.trim() },
        });

        logActivity(req, 'RENAME_FOLDER', `${existingFolder.name} -> ${updatedFolder.name}`);

        return NextResponse.json(updatedFolder);

    } catch (error) {
        console.error("Error renaming folder:", error);
        return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
    }
}
