"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker to enable multi-threading
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFViewer({
    pdfUrl,
    bookId,
    bookTitle,
    currentPage,
    onPageChange
}: {
    pdfUrl: string;
    bookId: string;
    bookTitle: string;
    currentPage: number;
    onPageChange: (page: number) => void;
}) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [scale, setScale] = useState(1.0);
    const router = useRouter();
    const [pageInput, setPageInput] = useState(currentPage.toString());
    const debouncedPage = useDebounce(currentPage, 1000);
    const [isBookmarking, setIsBookmarking] = useState(false);

    // Save reading progress to database silently
    useEffect(() => {
        if (debouncedPage) {
            fetch(`/api/books/${bookId}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastPage: debouncedPage })
            }).catch(console.error);
        }
    }, [debouncedPage, bookId]);

    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    const handlePageSubmit = (e: React.FormEvent | React.FocusEvent) => {
        e.preventDefault();
        const pageNumber = parseInt(pageInput, 10);
        if (!isNaN(pageNumber) && pageNumber >= 1 && (numPages ? pageNumber <= numPages : true)) {
            onPageChange(pageNumber);
        } else {
            setPageInput(currentPage.toString());
        }
    };

    function onDocumentLoadSuccess({ numPages: loadedNumPages }: { numPages: number }) {
        setNumPages(loadedNumPages);
        if (currentPage > loadedNumPages) {
            onPageChange(loadedNumPages);
        }
    }

    const changePage = (offset: number) => {
        onPageChange(Math.min(Math.max(1, currentPage + offset), numPages || 1));
    };

    const changeScale = (offset: number) => {
        setScale(prev => Math.min(Math.max(0.5, prev + offset), 3.0));
    };

    const handleAddBookmark = async () => {
        setIsBookmarking(true);
        try {
            const res = await fetch(`/api/books/${bookId}/bookmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageNumber: currentPage })
            });
            if (res.ok) {
                window.dispatchEvent(new CustomEvent('bookmark-added'));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsBookmarking(false);
        }
    };

    return (
        <div className="pdf-viewer" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Controls Bar */}
            <div className="glass" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--surface-border)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => router.push('/')}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', height: 'auto', borderRadius: '50%' }}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{bookTitle}</h2>
                    <button
                        onClick={handleAddBookmark}
                        disabled={isBookmarking}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', gap: '0.25rem' }}
                        title="Bookmark this page"
                    >
                        <BookmarkPlus size={14} />
                        {isBookmarking ? "..." : "Save"}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => changePage(-1)} disabled={currentPage <= 1} style={{ padding: '0.5rem' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <form onSubmit={handlePageSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem' }}>Page</span>
                            <input
                                type="text"
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                onBlur={handlePageSubmit}
                                className="input-field"
                                style={{ width: '50px', padding: '0.25rem', textAlign: 'center', height: '32px' }}
                            />
                            <span style={{ fontSize: '0.875rem', minWidth: '40px' }}>
                                of {numPages ?? '--'}
                            </span>
                        </form>
                        <button className="btn btn-secondary" onClick={() => changePage(1)} disabled={currentPage >= (numPages || 1)} style={{ padding: '0.5rem' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '20px', background: 'var(--surface-border)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => changeScale(-0.2)} disabled={scale <= 0.5} style={{ padding: '0.5rem' }}>
                            <ZoomOut size={16} />
                        </button>
                        <span style={{ fontSize: '0.875rem', minWidth: '50px', textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
                        <button className="btn btn-secondary" onClick={() => changeScale(0.2)} disabled={scale >= 3.0} style={{ padding: '0.5rem' }}>
                            <ZoomIn size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* PDF Document Container */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                background: 'var(--muted)',
                display: 'flex',
                justifyContent: 'center',
                padding: '2rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                                Loading PDF...
                            </div>
                        }
                    >
                        <div className="glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
                            <Page
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                            />
                        </div>
                    </Document>
                </div>
            </div>
        </div>
    );
}
