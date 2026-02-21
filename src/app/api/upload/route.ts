import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to file system
    const uploadDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate a unique filename
    const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = join(uploadDir, uniqueFileName);

    await writeFile(filePath, buffer);

    // Save to Database
    const book = await prisma.book.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""), // title without extension
        fileName: uniqueFileName,
        filePath: filePath,
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json({ success: true, book });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
