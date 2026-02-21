import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { stat, open } from "fs/promises";
import { existsSync } from "fs";
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
        const bookId = resolvedParams.id;
        const book = await prisma.book.findUnique({
            where: {
                id: bookId,
                userId: (session.user as any).id,
            },
        });

        if (!book || !existsSync(book.filePath)) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        const filePath = book.filePath;
        const fileStat = await stat(filePath);
        const fileSize = fileStat.size;

        const rangeHeader = req.headers.get("range");

        let status = 200;
        let headers = new Headers({
            "Content-Type": "application/pdf",
            "Accept-Ranges": "bytes",
        });

        let start = 0;
        let end = fileSize - 1;
        let streamOptions = {};

        if (rangeHeader) {
            const parts = rangeHeader.replace(/bytes=/, "").split("-");
            start = parseInt(parts[0], 10);
            end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize || end >= fileSize) {
                return new NextResponse(null, {
                    status: 416,
                    headers: {
                        "Content-Range": `bytes */${fileSize}`,
                    },
                });
            }

            status = 206;
            headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
            streamOptions = { start, end };
        }

        const chunkSize = end - start + 1;
        headers.set("Content-Length", chunkSize.toString());

        const fileHandle = await open(filePath, "r");
        const stream = fileHandle.createReadStream(streamOptions);

        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk) => controller.enqueue(chunk));
                stream.on("end", () => {
                    controller.close();
                    fileHandle.close();
                });
                stream.on("error", (err) => {
                    controller.error(err);
                    fileHandle.close();
                });
            },
            cancel() {
                stream.destroy();
                fileHandle.close();
            }
        });

        return new NextResponse(webStream, {
            status,
            headers,
        });
    } catch (error) {
        console.error("Streaming error:", error);
        return NextResponse.json({ error: "Failed to stream PDF" }, { status: 500 });
    }
}
