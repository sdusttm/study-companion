"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PDFViewer } from "./PDFViewer";
import { NoteSidebar } from "./NoteSidebar";

export function ClientReaderLayout({ book }: { book: any }) {
    const searchParams = useSearchParams();
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const [currentPage, setCurrentPage] = useState(initialPage);

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', overflow: 'hidden' }}>
            <div style={{ flex: 1, borderRight: '1px solid var(--surface-border)', position: 'relative' }}>
                <PDFViewer
                    pdfUrl={book.filePath.startsWith("http") ? book.filePath : `/api/books/${book.id}/pdf`}
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
