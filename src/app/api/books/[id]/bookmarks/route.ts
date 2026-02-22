import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// GET all bookmarks for a specific book
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;

        // Verify ownership
        const book = await prisma.book.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        const bookmarks = await prisma.bookmark.findMany({
            where: {
                bookId: resolvedParams.id,
                userId: (session.user as any).id,
            },
            orderBy: {
                pageNumber: 'asc'
            }
        });

        return NextResponse.json({ bookmarks });
    } catch (error: any) {
        console.error("Fetch bookmarks error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST a new bookmark for a specific book
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const { pageNumber, title } = await req.json();

        if (typeof pageNumber !== 'number' || pageNumber < 1) {
            return NextResponse.json({ error: "Invalid page number" }, { status: 400 });
        }

        // Verify ownership
        const book = await prisma.book.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        // Create the bookmark
        const bookmark = await prisma.bookmark.create({
            data: {
                bookId: resolvedParams.id,
                pageNumber,
                title: title || `Page ${pageNumber}`,
                userId: (session.user as any).id,
            }
        });

        return NextResponse.json({ success: true, bookmark });
    } catch (error: any) {
        console.error("Create bookmark error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
