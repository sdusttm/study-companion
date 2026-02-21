import { PrismaClient } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { ClientReaderLayout } from "@/components/ClientReaderLayout";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering 
export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    const resolvedParams = await params;
    const book = await prisma.book.findUnique({
        where: {
            id: resolvedParams.id,
            userId: (session.user as any).id
        },
    });

    if (!book) {
        notFound();
    }

    return <ClientReaderLayout book={book} />;
}
