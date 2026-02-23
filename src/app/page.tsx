import { PrismaClient } from "@prisma/client";
import { UploadBook } from "@/components/UploadBook";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LibraryGrid, LibraryItem } from "@/components/LibraryGrid";
import { CreateFolderButton } from "@/components/CreateFolderButton";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  const [books, folders] = await Promise.all([
    prisma.book.findMany({
      where: { userId, folderId: null },
      orderBy: { order: "asc" },
    }),
    prisma.folder.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    }),
  ]);

  const items: LibraryItem[] = [
    ...folders.map((f) => ({
      id: f.id,
      type: "folder" as const,
      title: f.name,
      order: f.order,
      uploadedAt: f.createdAt,
    })),
    ...books.map((b) => ({
      id: b.id,
      type: "book" as const,
      title: b.title,
      order: b.order,
      uploadedAt: b.uploadedAt,
    })),
  ].sort((a, b) => a.order - b.order); // Initial sort by order

  // Server action for handling a refresh after creating a folder
  async function reloadLibrary() {
    "use server";
    revalidatePath("/");
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Your Library</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Organize, upload, and study your textbooks efficiently.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <CreateFolderButton onFolderCreated={reloadLibrary} />
          <UploadBook
            env={{
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
              supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
            }}
            existingBooks={books.map(b => ({ id: b.id, title: b.title, fileHash: b.fileHash }))}
          />
        </div>
      </header>

      <LibraryGrid initialItems={items} />
    </div>
  );
}
