import { PrismaClient } from "@prisma/client";
import Link from "next/link";
import { UploadBook } from "@/components/UploadBook";
import { DeleteBookButton } from "@/components/DeleteBookButton";
import { FileText, Calendar } from "lucide-react";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

// In Next.js App Router, caching might bite us. Force dynamic rendering for the dashboard.
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const books = await prisma.book.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Your Library</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Upload and study your textbooks efficiently.</p>
        </div>
        <UploadBook
          env={{
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
          }}
          existingBooks={books.map(b => ({ id: b.id, title: b.title, fileHash: b.fileHash }))}
        />
      </header>

      {books.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: '4rem', borderRadius: 'var(--radius)', border: '1px dashed var(--glass-border)' }}>
          <FileText size={48} style={{ margin: '0 auto', color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No books uploaded yet</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>Upload your first PDF to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {books.map((book) => (
            <div className="card" key={book.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', position: 'relative' }}>
              <Link href={`/reader/${book.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(4px)',
                  height: '160px',
                  borderRadius: 'calc(var(--radius) - 4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  border: '1px solid var(--surface-border)'
                }}>
                  <FileText size={48} />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                      {book.title}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    <Calendar size={14} />
                    {new Date(book.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
              <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', zIndex: 10 }}>
                <DeleteBookButton bookId={book.id} bookTitle={book.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
