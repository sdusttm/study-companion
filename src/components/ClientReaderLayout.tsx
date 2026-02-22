"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { NoteSidebar } from "./NoteSidebar";

const PDFViewer = dynamic(() => import("./PDFViewer").then(mod => mod.PDFViewer), {
    ssr: false,
    loading: () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
            <Loader2 className="spinning" size={32} style={{ color: 'var(--primary)' }} />
            <p style={{ marginTop: '1rem', color: 'var(--muted-foreground)' }}>Loading PDF Engine...</p>
        </div>
    )
});

export function ClientReaderLayout({ book }: { book: any }) {
    const searchParams = useSearchParams();
    const pageParam = searchParams.get("page");
    const bookLastPage = book.lastPage?.toString() || "1";

    const [currentPage, setCurrentPage] = useState(() =>
        parseInt(pageParam || bookLastPage, 10)
    );

    const prevBookIdRef = React.useRef(book.id);

    useEffect(() => {
        if (pageParam) {
            const pageNum = parseInt(pageParam, 10);
            if (!isNaN(pageNum) && pageNum !== currentPage) {
                setCurrentPage(pageNum);
            }
        } else if (book.id !== prevBookIdRef.current) {
            // Only re-sync with server prop when the book ID actually changes
            // to avoid fighting local user scrolling state
            const serverPage = parseInt(bookLastPage, 10);
            if (!isNaN(serverPage)) {
                setCurrentPage(serverPage);
            }
            prevBookIdRef.current = book.id;
        }
    }, [pageParam, book.id, bookLastPage]);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', overflow: 'hidden' }}>
            <div style={{ flex: 1, borderRight: '1px solid var(--surface-border)', position: 'relative' }}>
                <PDFViewer
                    pdfUrl={book.filePath.startsWith("http") ? book.filePath : `/api/books/${book.id}/pdf`}
                    bookId={book.id}
                    bookTitle={book.title}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

            <div className="glass" style={{ width: '400px', flexShrink: 0, borderLeft: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                <NoteSidebar bookId={book.id} currentPage={currentPage} />
            </div>
        </div>
    );
}
