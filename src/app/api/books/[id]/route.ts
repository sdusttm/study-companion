import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        // Find the book first to ensure it belongs to the user
        const book = await prisma.book.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            },
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        // Delete from DB
        await prisma.book.delete({
            where: { id: book.id }
        });

        logActivity(req, 'DELETE_BOOK', book.title);

        // Optionally, one could delete from Supabase storage here using the Supabase API
        // For now, deleting the DB record correctly removes it from the user's library

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting book:", error);
        return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
    }
}
