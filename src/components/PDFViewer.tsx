"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, BookmarkPlus, Maximize, Trash2, X, Edit3, Check } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// react-pdf-viewer imports
import { Worker, Viewer, SpecialZoomLevel, DocumentLoadEvent, PageChangeEvent, ScrollMode } from '@react-pdf-viewer/core';
import { highlightPlugin, Trigger, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';

interface Note {
    id: string;
    content: string;
    createdAt: string;
}

interface Highlight {
    id: string;
    pageNumber: number;
    content: string;
    notes: Note[];
    color?: string;
    createdAt: string;
    position: any;
}

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

    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

    const isProgrammaticScrollRef = useRef(false);

    // Initial jump state flag
    const [initialJumpDone, setInitialJumpDone] = useState(false);

    // In-place editing state
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ left: number, top: number } | null>(null);
    const viewerContainerRef = useRef<HTMLDivElement>(null);

    // Use refs for latest state to keep plugin callbacks stable
    const highlightsRef = useRef(highlights);
    const activeHighlightIdRef = useRef(activeHighlightId);

    useEffect(() => {
        highlightsRef.current = highlights;
    }, [highlights]);

    useEffect(() => {
        activeHighlightIdRef.current = activeHighlightId;
    }, [activeHighlightId]);

    const pageNavigationPluginInstance = pageNavigationPlugin();
    const scrollModePluginInstance = scrollModePlugin();
    const { jumpToPage } = pageNavigationPluginInstance;

    // Maintain a ref to the latest highlight plugin instance for async callbacks
    const highlightPluginInstanceRef = useRef<any>(null);

    const handleDeleteHighlight = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this highlight?")) return;
        try {
            const res = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHighlights(prev => prev.filter(h => h.id !== id));
                setActiveHighlightId(null);
                window.dispatchEvent(new CustomEvent('highlight-deleted', { detail: { id } }));
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    const handleAddNote = useCallback(async (highlightId: string, content: string) => {
        try {
            const res = await fetch(`/api/highlights/${highlightId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                const newNote = await res.json();
                setHighlights(prev => prev.map(h =>
                    h.id === highlightId ? { ...h, notes: [...(h.notes || []), newNote] } : h
                ));
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleDeleteNote = useCallback(async (highlightId: string, noteId: string) => {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            const res = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setHighlights(prev => prev.map(h =>
                    h.id === highlightId ? { ...h, notes: h.notes.filter((n: any) => n.id !== noteId) } : h
                ));
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleSaveHighlight = useCallback(async (highlightDraft: any) => {
        try {
            const res = await fetch(`/api/books/${bookId}/highlights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(highlightDraft)
            });

            if (res.ok) {
                const saved = await res.json();
                setHighlights(prev => [...prev, saved]);
                window.dispatchEvent(new CustomEvent('highlight-added', { detail: saved }));
                setActiveHighlightId(saved.id);
            }
        } catch (error) {
            console.error(error);
        }
    }, [bookId]);

    // Stabilize the configuration for the highlight plugin
    const highlightConfig = useMemo(() => ({
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
                                color: swatch.name.toLowerCase(),
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
            const pageHighlights = highlightsRef.current.filter(h => {
                if (!Array.isArray(h.position)) return false;
                return h.position.some((area: any) => area.pageIndex === renderProps.pageIndex);
            });

            return (
                <div key={`highlights-${renderProps.pageIndex}`}>
                    {pageHighlights.map(h => {
                        const areasOnPage = h.position.filter((area: any) => area.pageIndex === renderProps.pageIndex);
                        const colorMap: Record<string, string> = {
                            'yellow': 'rgba(255, 226, 143, 0.4)',
                            'green': 'rgba(172, 236, 172, 0.4)',
                            'blue': 'rgba(164, 203, 255, 0.4)',
                            'pink': 'rgba(255, 179, 217, 0.4)',
                            'purple': 'rgba(219, 185, 255, 0.4)'
                        };
                        const bgColor = colorMap[h.color || 'yellow'] || colorMap['yellow'];
                        const isActive = h.id === activeHighlightIdRef.current;

                        return areasOnPage.map((area: any, idx: number) => (
                            <div
                                key={`${h.id}-${idx}`}
                                style={{
                                    position: 'absolute',
                                    ...renderProps.getCssProperties(area, renderProps.rotation),
                                    pointerEvents: 'none',
                                    zIndex: isActive ? 1000 : 100 // High zIndex to be above text layer
                                }}
                            >
                                <div
                                    data-highlight-id={h.id}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: bgColor,
                                        mixBlendMode: 'multiply',
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                        border: isActive ? '2px solid var(--primary)' : 'none',
                                        borderRadius: '2px',
                                        userSelect: 'none'
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setActiveHighlightId(h.id);
                                    }}
                                    title="Click to view/edit note"
                                />
                            </div>
                        ));
                    })}
                </div>
            );
        }
    }), [handleSaveHighlight]); // Only changes if handleSaveHighlight changes (which is stable)

    // Core highlight plugin instantiation
    const highlightPluginInstance = highlightPlugin(highlightConfig);

    // Update ref to current instance
    useEffect(() => {
        highlightPluginInstanceRef.current = highlightPluginInstance;
    }, [highlightPluginInstance]);

    // Update popover position when activeHighlightId changes or during scroll
    useEffect(() => {
        if (!activeHighlightId || !viewerContainerRef.current) {
            setPopoverPosition(null);
            return;
        }

        let retryCount = 0;
        const maxRetries = 10;
        let timeoutId: NodeJS.Timeout;

        const updatePosition = () => {
            const highlightElement = viewerContainerRef.current?.querySelector(`[data-highlight-id="${activeHighlightId}"]`);
            if (highlightElement) {
                const highlightRect = highlightElement.getBoundingClientRect();
                const containerRect = viewerContainerRef.current!.getBoundingClientRect();

                setPopoverPosition({
                    left: highlightRect.left - containerRect.left + (highlightRect.width / 2),
                    top: highlightRect.top - containerRect.top
                });
            } else if (retryCount < maxRetries) {
                retryCount++;
                timeoutId = setTimeout(updatePosition, 100);
            }
        };

        updatePosition();

        // Listen for scroll events in the PDF viewer's scrolling container
        const scrollContainer = viewerContainerRef.current.querySelector('.rpv-core__inner-pages');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
            return () => {
                scrollContainer.removeEventListener('scroll', updatePosition);
                window.removeEventListener('resize', updatePosition);
                if (timeoutId) clearTimeout(timeoutId);
            };
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [activeHighlightId]);

    // Listen to sidebar click jump events
    useEffect(() => {
        const handleNavigateToHighlight = (e: CustomEvent<{ highlightId: string }>) => {
            const h = highlightsRef.current.find(item => item.id === e.detail.highlightId);
            if (h && Array.isArray(h.position) && h.position.length > 0) {
                // @react-pdf-viewer is 0-indexed internally
                const targetPageIndex = h.position[0].pageIndex;
                const newPage = targetPageIndex + 1;

                isProgrammaticScrollRef.current = true;
                internalPageRef.current = newPage;

                // Sync parent state first to update page indicators
                if (newPage !== currentPage) {
                    onPageChange(newPage);
                }

                // Set active highlight to open popover
                setActiveHighlightId(h.id);

                // Small delay to ensure React state update (onPageChange) has started/settled
                // and to allow the viewer to prepare for the jump
                setTimeout(() => {
                    const areaWithContext = {
                        ...h.position[0],
                        top: Math.max(0, h.position[0].top - 5)
                    };

                    try {
                        // Always use the latest plugin instance via ref
                        if (highlightPluginInstanceRef.current) {
                            highlightPluginInstanceRef.current.jumpToHighlightArea(areaWithContext);
                        }
                    } catch (err) {
                        console.error("PDFViewer: Failed to jump", err);
                        // Fallback to simple page jump if highlight jump fails
                        jumpToPage(targetPageIndex);
                    }

                    // Keep programmatic scroll lock for a bit longer to absorb bounce events
                    setTimeout(() => {
                        isProgrammaticScrollRef.current = false;
                    }, 1000);
                }, 50);
            }
        };

        window.addEventListener('navigate-to-highlight', handleNavigateToHighlight as EventListener);
        return () => window.removeEventListener('navigate-to-highlight', handleNavigateToHighlight as EventListener);
    }, [highlightPluginInstance, jumpToPage, currentPage, onPageChange]);

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

    // Lock to prevent scroll bounce during hydration
    const isLayoutSettlingRef = useRef(true);
    const hasHydratedRef = useRef(false);
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

    // Perform the initial jump on mount without triggering scroll hooks
    useEffect(() => {
        if (numPages && !hasHydratedRef.current) {
            hasHydratedRef.current = true;

            // Wait 100ms for the DOM and virtualized list to settle in the engine
            setTimeout(() => {
                if (currentPage > 1) {
                    isProgrammaticScrollRef.current = true;
                    jumpToPage(currentPage - 1);
                }

                // Allow another half second for the viewport bounce math to finish 
                // before we re-enable user page tracking
                setTimeout(() => {
                    isLayoutSettlingRef.current = false;
                }, 500);
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
        if (isLayoutSettlingRef.current) {
            // Actively shield the parent state from rogue bounce events (like jump to 0) during hydration
            return;
        }

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
                ref={viewerContainerRef}
                style={{
                    flex: 1,
                    background: 'var(--muted)',
                    padding: '2rem',
                    overflow: 'hidden',
                    position: 'relative' // Essential for coordinate tracking
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

                {/* Portal for HighlightPopover */}
                {activeHighlightId && popoverPosition && createPortal(
                    <HighlightPopover
                        highlight={highlights.find(h => h.id === activeHighlightId)}
                        onClose={() => setActiveHighlightId(null)}
                        onDelete={handleDeleteHighlight}
                        onAddNote={handleAddNote}
                        onDeleteNote={handleDeleteNote}
                        containerStyle={{
                            left: `${popoverPosition.left}px`,
                            top: `${popoverPosition.top}px`,
                        }}
                    />,
                    viewerContainerRef.current!
                )}
            </div>
        </div>
    );
}

function HighlightPopover({
    highlight,
    onClose,
    onDelete,
    onAddNote,
    onDeleteNote,
    containerStyle
}: {
    highlight: Highlight | undefined,
    onClose: () => void,
    onDelete: (id: string) => void,
    onAddNote: (id: string, content: string) => Promise<void>,
    onDeleteNote: (highlightId: string, noteId: string) => Promise<void>,
    containerStyle: React.CSSProperties
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = async () => {
        if (!newNote.trim()) return;
        setIsSaving(true);
        await onAddNote(highlight!.id, newNote.trim());
        setIsSaving(false);
        setIsAdding(false);
        setNewNote("");
    };

    if (!highlight) return null;

    return (
        <div style={{
            ...containerStyle,
            position: 'absolute',
            zIndex: 10000,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -100%)', // Center and move above the highlight
            marginTop: '-10px',
        }}>
            <div className="glass" style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                width: '260px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                border: '1px solid var(--surface-border)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: 'var(--foreground)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Notes</span>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center' }}>
                        <X size={12} />
                    </button>
                </div>

                {highlight.notes && highlight.notes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                        {highlight.notes.map((note) => (
                            <div key={note.id} style={{
                                padding: '0.375rem 0.5rem',
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--surface-border)',
                                position: 'relative'
                            }}>
                                <p style={{ fontSize: '0.75rem', margin: 0, whiteSpace: 'pre-wrap', textAlign: 'left', paddingRight: '16px', lineHeight: '1.3' }}>
                                    {note.content}
                                </p>
                                <button
                                    onClick={() => onDeleteNote(highlight.id, note.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--muted-foreground)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        opacity: 0.6
                                    }}
                                >
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {isAdding ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                        <textarea
                            autoFocus
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="input-field"
                            placeholder="Add a new note..."
                            style={{
                                width: '100%',
                                minHeight: '40px',
                                fontSize: '0.75rem',
                                padding: '0.375rem',
                                resize: 'vertical',
                                background: 'var(--background)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', height: 'auto', minHeight: 0 }}
                                onClick={() => setIsAdding(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem', height: 'auto', minHeight: 0 }}
                                disabled={isSaving}
                                onClick={handleAdd}
                            >
                                {isSaving ? "Adding..." : "Add"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem', borderRadius: '50%', color: 'var(--destructive)', height: 'auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => onDelete(highlight.id)}
                            title="Delete Highlight"
                        >
                            <Trash2 size={12} />
                        </button>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem', borderRadius: '999px', height: 'auto', minHeight: 0 }}
                            onClick={() => setIsAdding(true)}
                        >
                            + Add Note
                        </button>
                    </div>
                )}

                {/* Arrow/Tail for the popover */}
                <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '12px',
                    height: '12px',
                    background: 'inherit',
                    borderRight: '1px solid var(--surface-border)',
                    borderBottom: '1px solid var(--surface-border)',
                }} />
            </div>
        </div>
    );
}
