import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const resolvedParams = await params;
        const body = await req.json();
        const { content } = body;

        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        // Verify highlight ownership
        const highlight = await prisma.highlight.findUnique({
            where: {
                id: resolvedParams.id,
                userId: (session.user as any).id,
            }
        });

        if (!highlight) {
            return NextResponse.json({ error: "Highlight not found or unauthorized" }, { status: 404 });
        }

        const note = await prisma.note.create({
            data: {
                content,
                highlightId: highlight.id,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error("Error creating note:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}
