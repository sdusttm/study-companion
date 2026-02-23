import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name } = body;

        if (!name || typeof name !== "string") {
            return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
        }

        const folder = await prisma.folder.create({
            data: {
                name,
                userId: (session.user as any).id,
                // Optional: add ordering logic here if needed
            },
        });

        return NextResponse.json(folder);
    } catch (error) {
        console.error("Error creating folder:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
