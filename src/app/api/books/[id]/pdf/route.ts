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
        const bookId = resolvedParams.id;
        const book = await prisma.book.findUnique({
            where: {
                id: bookId,
                userId: (session.user as any).id,
            },
        });

        if (!book || !book.filePath) {
            return NextResponse.json({ error: "Book not found" }, { status: 404 });
        }

        const isUrl = book.filePath.startsWith("http://") || book.filePath.startsWith("https://");

        if (isUrl) {
            // Proxy the request to Supabase Storage
            const headers = new Headers();
            const rangeHeader = req.headers.get("range");
            if (rangeHeader) {
                headers.set("Range", rangeHeader);
            }

            const storageResponse = await fetch(book.filePath, { headers });

            if (!storageResponse.ok) {
                console.error("Storage returned:", storageResponse.status);
                return NextResponse.json({ error: "Failed to fetch PDF from storage" }, { status: 500 });
            }

            const responseHeaders = new Headers();
            responseHeaders.set("Content-Type", storageResponse.headers.get("Content-Type") || "application/pdf");
            responseHeaders.set("Accept-Ranges", "bytes");

            if (storageResponse.headers.has("Content-Length")) {
                responseHeaders.set("Content-Length", storageResponse.headers.get("Content-Length") as string);
            }
            if (storageResponse.headers.has("Content-Range")) {
                responseHeaders.set("Content-Range", storageResponse.headers.get("Content-Range") as string);
            }

            return new NextResponse(storageResponse.body, {
                status: storageResponse.status,
                headers: responseHeaders,
            });
        }

        // Fallback for purely local files (if migrating)
        const { stat, open } = require("fs/promises");
        const { existsSync } = require("fs");

        if (!existsSync(book.filePath)) {
            return NextResponse.json({ error: "Local file not found" }, { status: 404 });
        }

        const fileStat = await stat(book.filePath);
        const fileSize = fileStat.size;
        const rangeHeader = req.headers.get("range");

        let status = 200;
        let responseHeaders = new Headers({
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
                    headers: { "Content-Range": `bytes */${fileSize}` },
                });
            }

            status = 206;
            responseHeaders.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
            streamOptions = { start, end };
        }

        const chunkSize = end - start + 1;
        responseHeaders.set("Content-Length", chunkSize.toString());

        const fileHandle = await open(book.filePath, "r");
        const stream = fileHandle.createReadStream(streamOptions);

        const webStream = new ReadableStream({
            start(controller) {
                stream.on("data", (chunk: any) => controller.enqueue(chunk));
                stream.on("end", () => {
                    controller.close();
                    fileHandle.close();
                });
                stream.on("error", (err: any) => {
                    controller.error(err);
                    fileHandle.close();
                });
            },
            cancel() {
                stream.destroy();
                fileHandle.close();
            }
        });

        return new NextResponse(webStream, { status, headers: responseHeaders });
    } catch (error) {
        console.error("Streaming error:", error);
        return NextResponse.json({ error: "Failed to stream PDF" }, { status: 500 });
    }
}
