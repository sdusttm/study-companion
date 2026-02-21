"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker to enable multi-threading
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFViewer({
    bookId,
    bookTitle,
    currentPage,
    onPageChange
}: {
    bookId: string;
    bookTitle: string;
    currentPage: number;
    onPageChange: (page: number) => void;
}) {
    const [numPages, setNumPages] = useState<number | null>(null);
    const [scale, setScale] = useState(1.0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        onPageChange(1);
    }

    const changePage = (offset: number) => {
        onPageChange(Math.min(Math.max(1, currentPage + offset), numPages || 1));
    };

    const changeScale = (offset: number) => {
        setScale(prev => Math.min(Math.max(0.5, prev + offset), 3.0));
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
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{bookTitle}</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => changePage(-1)} disabled={currentPage <= 1} style={{ padding: '0.5rem' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '0.875rem', minWidth: '80px', textAlign: 'center' }}>
                            Page {currentPage} of {numPages ?? '--'}
                        </span>
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
                        file={`/api/books/${bookId}/pdf`}
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
