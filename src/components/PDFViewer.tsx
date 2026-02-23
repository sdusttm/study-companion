"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus, Maximize } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// react-pdf-viewer imports
import { Worker, Viewer, SpecialZoomLevel, DocumentLoadEvent, PageChangeEvent, ScrollMode } from '@react-pdf-viewer/core';
import { highlightPlugin, Trigger, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';

// Re-using same UI components for existing highlights
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
    const [scale, setScale] = useState<number | SpecialZoomLevel>(SpecialZoomLevel.PageWidth);
    const router = useRouter();
    const [pageInput, setPageInput] = useState(currentPage.toString());
    const debouncedPage = useDebounce(currentPage, 1000);
    const [isBookmarking, setIsBookmarking] = useState(false);

    const [highlights, setHighlights] = useState<Array<any>>([]);
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

    const isProgrammaticScrollRef = useRef(false);

    // Initial jump state flag
    const [initialJumpDone, setInitialJumpDone] = useState(false);

    const pageNavigationPluginInstance = pageNavigationPlugin();
    const { jumpToPage } = pageNavigationPluginInstance;

    const scrollModePluginInstance = scrollModePlugin();

    // Core highlight plugin instantiation
    const highlightPluginInstance = highlightPlugin({
        trigger: Trigger.TextSelection,
        renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => (
            <div className="highlight-popup glass" style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                position: 'absolute',
                left: `${renderProps.selectionRegion.left}%`,
                top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`,
                zIndex: 100,
                transform: 'translate(0, 8px)'
            }}>
                {[
                    { name: 'Yellow', color: 'rgba(255, 226, 143, 0.8)' },
                    { name: 'Green', color: 'rgba(172, 236, 172, 0.8)' },
                    { name: 'Blue', color: 'rgba(164, 203, 255, 0.8)' },
                    { name: 'Pink', color: 'rgba(255, 179, 217, 0.8)' },
                    { name: 'Purple', color: 'rgba(219, 185, 255, 0.8)' }
                ].map((swatch) => (
                    <button
                        key={swatch.name}
                        title={`Highlight ${swatch.name}`}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: swatch.color,
                            border: '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                        }}
                        onClick={() => {
                            const newHighlight = {
                                content: renderProps.selectedText,
                                color: swatch.name.toLowerCase(), // Save string mnemonic
                                position: renderProps.highlightAreas,
                                comment: '',
                                pageNumber: renderProps.highlightAreas[0].pageIndex + 1
                            };

                            renderProps.toggle();
                            handleSaveHighlight(newHighlight);
                        }}
                    />
                ))}
            </div>
        ),
        renderHighlights: (renderProps: RenderHighlightsProps) => {
            const pageHighlights = highlights.filter(h => {
                // Ignore buggy legacy coordinates from react-pdf-highlighter
                if (!Array.isArray(h.position)) return false;

                return h.position.some((area: any) => area.pageIndex === renderProps.pageIndex);
            });

            return (
                <div>
                    {pageHighlights.map(h => {
                        const areasOnPage = h.position.filter((area: any) => area.pageIndex === renderProps.pageIndex);

                        // Map database string to visual RGBA color
                        const colorMap: Record<string, string> = {
                            'yellow': 'rgba(255, 226, 143, 0.8)',
                            'green': 'rgba(172, 236, 172, 0.8)',
                            'blue': 'rgba(164, 203, 255, 0.8)',
                            'pink': 'rgba(255, 179, 217, 0.8)',
                            'purple': 'rgba(219, 185, 255, 0.8)'
                        };
                        const bgColor = colorMap[h.color || 'yellow'] || colorMap['yellow'];

                        return areasOnPage.map((area: any, idx: number) => (
                            <div
                                key={`${h.id}-${idx}`}
                                style={{
                                    ...renderProps.getCssProperties(area, renderProps.rotation),
                                    position: 'absolute',
                                    backgroundColor: bgColor,
                                    mixBlendMode: 'multiply',
                                    pointerEvents: 'auto',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('edit-highlight', { detail: { id: h.id } }));
                                }}
                                title="Click to edit note"
                            />
                        ));
                    })}
                </div>
            );
        }
    });

    // Listen to sidebar click jump events
    useEffect(() => {
        const handleNavigateToHighlight = (e: CustomEvent<{ highlightId: string }>) => {
            const h = highlights.find(item => item.id === e.detail.highlightId);
            if (h && Array.isArray(h.position) && h.position.length > 0) {
                // @react-pdf-viewer is 0-indexed internally
                const targetPageIndex = h.position[0].pageIndex;
                const newPage = targetPageIndex + 1;

                isProgrammaticScrollRef.current = true;
                internalPageRef.current = newPage;

                // The highlight library natively handles scrolling into the specific rectangle view!
                // We subtract 5 from the 'top' percentage to scroll slightly above the highlight, providing reading context
                const areaWithContext = {
                    ...h.position[0],
                    top: Math.max(0, h.position[0].top - 5)
                };
                highlightPluginInstance.jumpToHighlightArea(areaWithContext);

                if (newPage !== currentPage) {
                    onPageChange(newPage);
                }

                // Allow some time before recording manual scrolls again
                setTimeout(() => {
                    isProgrammaticScrollRef.current = false;
                }, 1000);
            }
        };

        window.addEventListener('navigate-to-highlight', handleNavigateToHighlight as EventListener);
        return () => window.removeEventListener('navigate-to-highlight', handleNavigateToHighlight as EventListener);
    }, [highlights, highlightPluginInstance, currentPage, onPageChange]);

    // Save highlight to DB
    const handleSaveHighlight = async (highlightDraft: any) => {
        try {
            const res = await fetch(`/api/books/${bookId}/highlights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(highlightDraft)
            });

            if (res.ok) {
                const saved = await res.json();
                setHighlights(prev => [...prev, saved]);
                // Dispatch event to update sidebar
                window.dispatchEvent(new CustomEvent('highlight-added', { detail: saved }));
                // Automatically open the corresponding Note textarea box
                window.dispatchEvent(new CustomEvent('edit-highlight', { detail: { id: saved.id } }));
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Fetch highlights and listen for external deletions
    useEffect(() => {
        const fetchHighlights = async () => {
            try {
                const res = await fetch(`/api/books/${bookId}/highlights`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setHighlights(data.map((h: any) => ({
                        ...h,
                        position: h.position // Keeping the raw JSON array of highlightAreas
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch highlights", err);
            } finally {
                setIsLoadingHighlights(false);
            }
        };

        fetchHighlights();

        const handleHighlightDeleted = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.id) {
                setHighlights(prev => prev.filter(h => h.id !== customEvent.detail.id));
            }
        };

        window.addEventListener('highlight-deleted', handleHighlightDeleted);
        return () => window.removeEventListener('highlight-deleted', handleHighlightDeleted);
    }, [bookId]);

    const [hasMounted, setHasMounted] = useState(false);

    // Save reading progress silently
    useEffect(() => {
        if (!hasMounted) {
            setHasMounted(true);
            return;
        }

        // Prevent aggressive saves on initial layout hydration
        if (debouncedPage && debouncedPage !== 1) {
            fetch(`/api/books/${bookId}/progress`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastPage: debouncedPage })
            }).catch(console.error);
        }
    }, [debouncedPage, bookId, hasMounted]);

    // Update input box purely for visual sync
    useEffect(() => {
        setPageInput(currentPage.toString());
    }, [currentPage]);

    const hasJumpedInitially = useRef(false);
    const internalPageRef = useRef(currentPage);

    // Watch for external page changes (e.g., clicking a note in sidebar)
    // When the prop diverges from our internal tracker, it's an external jump command.
    useEffect(() => {
        if (numPages && currentPage !== internalPageRef.current) {
            internalPageRef.current = currentPage;
            isProgrammaticScrollRef.current = true;
            jumpToPage(currentPage - 1);
        }
    }, [currentPage, numPages, jumpToPage]);

    // Perform the initial jump on mount without snapping during normal scrolling
    useEffect(() => {
        if (numPages && currentPage > 1 && !hasJumpedInitially.current) {
            hasJumpedInitially.current = true;

            // Allow DOM and virtualized pages to settle before executing the programmatic jump
            setTimeout(() => {
                isProgrammaticScrollRef.current = true;
                jumpToPage(currentPage - 1);
            }, 100);
        }
    }, [numPages, currentPage, jumpToPage]);

    const handlePageSubmit = (e: React.FormEvent | React.FocusEvent) => {
        e.preventDefault();
        const pageNumber = parseInt(pageInput, 10);
        if (!isNaN(pageNumber) && pageNumber >= 1 && (numPages ? pageNumber <= numPages : true)) {
            isProgrammaticScrollRef.current = true;
            internalPageRef.current = pageNumber;
            jumpToPage(pageNumber - 1);
            onPageChange(pageNumber);
        } else {
            setPageInput(currentPage.toString());
        }
    };

    const changePage = (offset: number) => {
        const newPage = Math.min(Math.max(1, currentPage + offset), numPages || 1);
        isProgrammaticScrollRef.current = true;
        internalPageRef.current = newPage;
        jumpToPage(newPage - 1);
        onPageChange(newPage);
    };

    const changeScale = (offset: number) => {
        setScale(prev => {
            const current = typeof prev === 'string' ? 1.0 : prev;
            return Math.min(Math.max(0.5, current + offset), 3.0);
        });
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

    const handleDocumentLoad = (e: DocumentLoadEvent) => {
        setNumPages(e.doc.numPages);
    };

    const handlePageChange = (e: PageChangeEvent) => {
        if (isProgrammaticScrollRef.current) {
            // Ignore the scroll event generated by our own programmatic jumpToPage command
            isProgrammaticScrollRef.current = false;
            return;
        }

        const newPage = e.currentPage + 1;
        if (newPage !== currentPage) {
            internalPageRef.current = newPage;
            onPageChange(newPage);
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
                        <button className="btn btn-secondary" onClick={() => changeScale(-0.2)} disabled={typeof scale === 'number' && scale <= 0.5} style={{ padding: '0.5rem' }} title="Zoom Out">
                            <ZoomOut size={16} />
                        </button>
                        <span style={{ fontSize: '0.875rem', minWidth: '50px', textAlign: 'center' }}>
                            {typeof scale === 'number' ? `${Math.round(scale * 100)}%` : 'Fit'}
                        </span>
                        <button className="btn btn-secondary" onClick={() => changeScale(0.2)} disabled={typeof scale === 'number' && scale >= 3.0} style={{ padding: '0.5rem' }} title="Zoom In">
                            <ZoomIn size={16} />
                        </button>
                        <button className="btn btn-secondary" onClick={() => setScale(SpecialZoomLevel.PageWidth)} disabled={scale === SpecialZoomLevel.PageWidth} title="Fit to Width" style={{ padding: '0.5rem' }}>
                            <Maximize size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* PDF Document Container */}
            <div
                style={{
                    flex: 1,
                    background: 'var(--muted)',
                    padding: '2rem',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '1200px', margin: '0 auto', boxShadow: 'var(--shadow-lg)' }}>
                    {isLoadingHighlights && (
                        <div className="glass" style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius)',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--muted-foreground)'
                        }}>
                            <div className="spinning" style={{ width: '1rem', height: '1rem', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            Loading highlights...
                        </div>
                    )}

                    <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
                        <Viewer
                            fileUrl={pdfUrl}
                            initialPage={Math.max(0, currentPage - 1)}
                            plugins={[highlightPluginInstance, pageNavigationPluginInstance, scrollModePluginInstance]}
                            onDocumentLoad={handleDocumentLoad}
                            onPageChange={handlePageChange}
                            defaultScale={scale}
                            scrollMode={ScrollMode.Vertical}
                        />
                    </Worker>
                </div>
            </div>
        </div>
    );
}
