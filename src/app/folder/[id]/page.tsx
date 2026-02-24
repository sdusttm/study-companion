import { PrismaClient } from "@prisma/client";
import { UploadBook } from "@/components/UploadBook";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { LibraryGrid, LibraryItem } from "@/components/LibraryGrid";
import { RenameFolderModal } from "@/components/RenameFolderModal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const userId = (session.user as any).id;
    const resolvedParams = await params;
    const folderId = resolvedParams.id;

    const folder = await prisma.folder.findFirst({
        where: { id: folderId, userId },
    });

    if (!folder) {
        notFound();
    }

    const books = await prisma.book.findMany({
        where: { userId, folderId },
        orderBy: { order: "asc" },
    });

    const items: LibraryItem[] = books.map((b) => ({
        id: b.id,
        type: "book" as const,
        title: b.title,
        order: b.order,
        uploadedAt: b.uploadedAt,
    }));

    return (
        <div className="container animate-fade-in" style={{ padding: '2rem' }}>
            <Link href="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                color: 'var(--muted-foreground)',
                marginBottom: '1rem',
                fontSize: '0.875rem'
            }}>
                <ArrowLeft size={16} />
                Back to Library
            </Link>

            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>{folder.name}</h1>
                        <RenameFolderModal folderId={folderId} currentName={folder.name} variant="icon" />
                    </div>
                    <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>Folder</p>
                </div>
                <UploadBook
                    env={{
                        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
                        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
                    }}
                    existingBooks={books.map(b => ({ id: b.id, title: b.title, fileHash: b.fileHash }))}
                    folderId={folderId}
                />
            </header>

            <LibraryGrid initialItems={items} currentFolderId={folderId} />
        </div>
    );
}
