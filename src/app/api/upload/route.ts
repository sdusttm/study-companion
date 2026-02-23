import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

export const maxDuration = 60; // Allow upload to take up to 60 seconds on Vercel

export const dynamic = 'force-dynamic';



const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, fileName, filePath, fileHash, folderId } = await req.json();

    if (!title || !fileName || !filePath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save to Database
    console.log("Attempting to connect book to user ID:", (session.user as any).id);

    const bookData: any = {
      title,
      fileName,
      filePath,
      fileHash,
      user: {
        connect: {
          id: (session.user as any).id
        }
      }
    };

    if (folderId) {
      bookData.folder = {
        connect: {
          id: folderId
        }
      };
    }

    const book = await prisma.book.create({
      data: bookData,
    });

    return NextResponse.json({ success: true, book });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error?.message || "Failed to upload file" }, { status: 500 });
  }
}
