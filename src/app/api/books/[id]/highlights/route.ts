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
        const highlights = await prisma.highlight.findMany({
            where: {
                bookId: resolvedParams.id,
                userId: (session.user as any).id,
            },
            orderBy: { pageNumber: "asc" },
        });

        return NextResponse.json(highlights);
    } catch (error) {
        console.error("Error fetching highlights:", error);
        return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const body = await req.json();

        const { content, position, color, comment, pageNumber } = body;

        if (!content || !position || typeof pageNumber !== "number") {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify book ownership
        const book = await prisma.book.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!book) {
            return NextResponse.json({ error: "Book not found or unauthorized" }, { status: 404 });
        }

        const highlight = await prisma.highlight.create({
            data: {
                bookId: resolvedParams.id,
                userId: (session.user as any).id,
                content,
                color: color || "yellow",
                position,
                comment,
                pageNumber,
            },
        });

        return NextResponse.json(highlight, { status: 201 });
    } catch (error) {
        console.error("Error creating highlight:", error);
        return NextResponse.json({ error: "Failed to create highlight" }, { status: 500 });
    }
}
