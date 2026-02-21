import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const books = await prisma.book.findMany({
            where: { userId: (session.user as any).id },
            orderBy: { uploadedAt: "desc" },
        });
        return NextResponse.json(books);
    } catch (error) {
        console.error("Error fetching books:", error);
        return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
    }
}
