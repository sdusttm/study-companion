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
