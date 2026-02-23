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
        const { items } = body;
        // items should be [{ id: string, type: 'book' | 'folder', order: number }]

        if (!Array.isArray(items)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const userId = (session.user as any).id;

        // Use a transaction to ensure all updates succeed or fail together
        await prisma.$transaction(
            items.map((item) => {
                if (item.type === "book") {
                    return prisma.book.update({
                        where: { id: item.id, userId },
                        data: { order: item.order },
                    });
                } else if (item.type === "folder") {
                    return prisma.folder.update({
                        where: { id: item.id, userId },
                        data: { order: item.order },
                    });
                }
                throw new Error(`Invalid item type: ${item.type}`);
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating order:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
