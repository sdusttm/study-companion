"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PDFViewer } from "./PDFViewer";
import { NoteSidebar } from "./NoteSidebar";

export function ClientReaderLayout({ book }: { book: any }) {
    const searchParams = useSearchParams();
    const pageParam = searchParams.get("page");
    const bookLastPage = book.lastPage?.toString() || "1";

    const [currentPage, setCurrentPage] = useState(() =>
        parseInt(pageParam || bookLastPage, 10)
    );

    useEffect(() => {
        if (pageParam) {
            const pageNum = parseInt(pageParam, 10);
            if (!isNaN(pageNum) && pageNum !== currentPage) {
                setCurrentPage(pageNum);
            }
        }
    }, [pageParam]);

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
