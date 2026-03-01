"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    X,
    Search as SearchIcon,
    Bookmark,
    ZoomIn,
    ZoomOut,
    Maximize,
    Minimize,
    List
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// react-pdf-viewer imports
import { Worker, Viewer, SpecialZoomLevel, DocumentLoadEvent, PageChangeEvent, ScrollMode } from '@react-pdf-viewer/core';
import { highlightPlugin, Trigger, RenderHighlightTargetProps, RenderHighlightsProps } from '@react-pdf-viewer/highlight';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';
import { searchPlugin } from '@react-pdf-viewer/search';
import { bookmarkPlugin } from '@react-pdf-viewer/bookmark';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import '@react-pdf-viewer/bookmark/lib/styles/index.css';

import { HighlightPopover } from "./HighlightPopover";

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
    // --- 1. Ref Bridges for Stability ---
    const viewerContainerRef = useRef<HTMLDivElement>(null);
    const highlightsRef = useRef<Highlight[]>([]);
    const activeHighlightIdRef = useRef<string | null>(null);
    const isProgrammaticScrollRef = useRef(false);
    const internalPageRef = useRef(currentPage);
    const bookIdRef = useRef(bookId);
    const hasHydratedRef = useRef(false);
    const isLayoutSettlingRef = useRef(true);

    // --- 2. State Hooks ---
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageInput, setPageInput] = useState(currentPage.toString());
    const [scale, setScale] = useState<number | SpecialZoomLevel>(SpecialZoomLevel.PageWidth);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<{ left: number, top: number } | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showIndex, setShowIndex] = useState(false);

    // --- 3. Custom Hooks & Router ---
    const router = useRouter();
    const debouncedPage = useDebounce(currentPage, 1000);

    // --- 4. Callbacks ---
    useEffect(() => { bookIdRef.current = bookId; }, [bookId]);
    useEffect(() => { highlightsRef.current = highlights; }, [highlights]);
    useEffect(() => { activeHighlightIdRef.current = activeHighlightId; }, [activeHighlightId]);

    const handleSaveBookmark = useCallback(async () => {
        if (isSavingBookmark) return;
        setIsSavingBookmark(true);
        try {
            const res = await fetch(`/api/books/${bookIdRef.current}/bookmarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageNumber: currentPage })
            });
            if (res.ok) {
                const data = await res.json();
                window.dispatchEvent(new CustomEvent('bookmark-added', { detail: data.bookmark }));
            }
        } catch (error) {
            console.error("Save bookmark error:", error);
        } finally {
            setIsSavingBookmark(false);
        }
    }, [currentPage, isSavingBookmark]);

    const handleToggleFullscreen = useCallback(() => {
        if (!viewerContainerRef.current) return;
        if (!document.fullscreenElement) {
            viewerContainerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const adjustScrollOffset = useCallback(() => {
        setTimeout(() => {
            if (viewerContainerRef.current) {
                const scrollContainer = viewerContainerRef.current.querySelector('.rpv-core__inner-pages');
                if (scrollContainer) {
                    const viewportHeight = viewerContainerRef.current.clientHeight;
                    scrollContainer.scrollTop -= (viewportHeight * 0.25);
                }
            }
        }, 350);
    }, []);

    const handleSaveHighlight = useCallback(async (highlightDraft: any) => {
        try {
            const res = await fetch(`/api/books/${bookIdRef.current}/highlights`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(highlightDraft)
            });
            if (res.ok) {
                const saved = await res.json();
                setHighlights(prev => [...prev, saved]);
                window.dispatchEvent(new CustomEvent('highlight-added', { detail: saved }));
                setActiveHighlightId(saved.id);
            }
        } catch (error) { console.error(error); }
    }, []);

    const handleDeleteHighlight = useCallback(async (id: string) => {
        try {
            const res = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHighlights(prev => prev.filter(h => h.id !== id));
                setActiveHighlightId(null);
                window.dispatchEvent(new CustomEvent('highlight-deleted', { detail: { id } }));
            }
        } catch (err) { console.error(err); }
    }, []);

    const handleAddNote = useCallback(async (highlightId: string, content: string) => {
        try {
            const res = await fetch(`/api/highlights/${highlightId}/notes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                const newNote = await res.json();
                setHighlights(prev => prev.map(h =>
                    h.id === highlightId ? { ...h, notes: [...(h.notes || []), newNote] } : h
                ));
            }
        } catch (error) { console.error(error); }
    }, []);

    const handleDeleteNote = useCallback(async (highlightId: string, noteId: string) => {
        try {
            const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
            if (res.ok) {
                setHighlights(prev => prev.map(h =>
                    h.id === highlightId ? { ...h, notes: h.notes.filter(n => n.id !== noteId) } : h
                ));
            }
        } catch (error) { console.error(error); }
    }, []);

    // --- 5. Plugin Initializations (Direct Call) ---
    // In React 19 + @react-pdf-viewer v3, we call these directly in the component body
    const pageNavigationPluginInstance = pageNavigationPlugin();
    const scrollModePluginInstance = scrollModePlugin();
    const searchPluginInstance = searchPlugin();
    const bookmarkPluginInstance = bookmarkPlugin();

    // Stable highlight config bridge
    const highlightConfig = useMemo(() => ({
        trigger: Trigger.TextSelection,
        renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => (
            <div className="highlight-popup glass" style={{
                padding: '0.5rem', borderRadius: 'var(--radius)', display: 'flex', gap: '0.5rem',
                alignItems: 'center', position: 'absolute', left: `${renderProps.selectionRegion.left}%`,
                top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`,
                zIndex: 100, transform: 'translate(0, 8px)'
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
                        style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            backgroundColor: swatch.color, border: '1px solid rgba(0,0,0,0.1)',
                            cursor: 'pointer'
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
                            'yellow': 'rgba(255, 226, 143, 0.4)', 'green': 'rgba(172, 236, 172, 0.4)',
                            'blue': 'rgba(164, 203, 255, 0.4)', 'pink': 'rgba(255, 179, 217, 0.4)',
                            'purple': 'rgba(219, 185, 255, 0.4)'
                        };
                        const bgColor = colorMap[h.color || 'yellow'] || colorMap['yellow'];
                        const isActive = h.id === activeHighlightIdRef.current;
                        return areasOnPage.map((area: any, idx: number) => (
                            <div
                                key={`${h.id}-${idx}`}
                                style={{ position: 'absolute', ...renderProps.getCssProperties(area, renderProps.rotation), pointerEvents: 'none', zIndex: isActive ? 1000 : 100 }}
                            >
                                <div
                                    data-highlight-id={h.id}
                                    style={{
                                        width: '100%', height: '100%', backgroundColor: bgColor,
                                        mixBlendMode: 'multiply', pointerEvents: 'auto', cursor: 'pointer',
                                        border: isActive ? '2px solid var(--primary)' : 'none', borderRadius: '2px'
                                    }}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveHighlightId(h.id); }}
                                />
                            </div>
                        ));
                    })}
                </div>
            );
        }
    }), [handleSaveHighlight]);

    const highlightPluginInstance = highlightPlugin(highlightConfig);
    const { jumpToPage } = pageNavigationPluginInstance;
    const { Search } = searchPluginInstance;
    const { Bookmarks } = bookmarkPluginInstance;

    // --- 6. Effects ---
    useEffect(() => { setIsHydrated(true); }, []);
    useEffect(() => { setPageInput(currentPage.toString()); }, [currentPage]);

    // Popover Position Sync
    useEffect(() => {
        if (!activeHighlightId || !viewerContainerRef.current) { setPopoverPosition(null); return; }
        const updatePosition = () => {
            const el = viewerContainerRef.current?.querySelector(`[data-highlight-id="${activeHighlightId}"]`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const containerRect = viewerContainerRef.current!.getBoundingClientRect();
                setPopoverPosition({ left: rect.left - containerRect.left + (rect.width / 2), top: rect.top - containerRect.top });
            }
        };
        updatePosition();
        const scrollContainer = viewerContainerRef.current.querySelector('.rpv-core__inner-pages');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
            return () => { scrollContainer.removeEventListener('scroll', updatePosition); window.removeEventListener('resize', updatePosition); };
        }
    }, [activeHighlightId]);

    // Data Fetching
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/books/${bookId}/highlights`);
                const data = await res.json();
                if (Array.isArray(data)) setHighlights(data);
            } catch (err) { console.error(err); } finally { setIsLoadingHighlights(false); }
        })();
        const handleHighlightDeleted = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.id) setHighlights(prev => prev.filter(h => h.id !== detail.id));
        };
        window.addEventListener('highlight-deleted', handleHighlightDeleted);
        return () => window.removeEventListener('highlight-deleted', handleHighlightDeleted);
    }, [bookId]);

    // Progress Saving
    useEffect(() => {
        if (!isHydrated) return;
        if (debouncedPage && debouncedPage !== 1) {
            fetch(`/api/books/${bookId}/progress`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastPage: debouncedPage })
            }).catch(console.error);
        }
    }, [debouncedPage, bookId, isHydrated]);

    // External Page Sync
    useEffect(() => {
        if (numPages && currentPage !== internalPageRef.current) {
            internalPageRef.current = currentPage;
            isProgrammaticScrollRef.current = true;
            jumpToPage(currentPage - 1);
        }
    }, [currentPage, numPages, jumpToPage]);

    // Initial Jump
    useEffect(() => {
        if (numPages && !hasHydratedRef.current) {
            hasHydratedRef.current = true;
            setTimeout(() => {
                if (currentPage > 1) { isProgrammaticScrollRef.current = true; jumpToPage(currentPage - 1); }
                setTimeout(() => { isLayoutSettlingRef.current = false; }, 500);
            }, 100);
        }
    }, [numPages, currentPage, jumpToPage]);

    // Navigate to Highlight
    useEffect(() => {
        const handleNavigate = (e: Event) => {
            const h = highlightsRef.current.find(item => item.id === (e as CustomEvent).detail.highlightId);
            if (h && Array.isArray(h.position) && h.position.length > 0) {
                const targetPageIndex = h.position[0].pageIndex;
                const newPage = targetPageIndex + 1;
                isProgrammaticScrollRef.current = true;
                internalPageRef.current = newPage;
                if (newPage !== currentPage) onPageChange(newPage);
                setActiveHighlightId(h.id);
                setTimeout(() => {
                    const viewportHeight = viewerContainerRef.current?.clientHeight || 0;
                    const pageElement = viewerContainerRef.current?.querySelector('.rpv-core__page');
                    const pageHeight = pageElement?.clientHeight || 1000;
                    // 25% of viewport as a percentage of page height
                    const offset = (0.25 * viewportHeight / pageHeight) * 100;

                    highlightPluginInstance.jumpToHighlightArea({
                        ...h.position[0],
                        top: Math.max(0, h.position[0].top - offset)
                    });
                    setTimeout(() => { isProgrammaticScrollRef.current = false; }, 1000);
                }, 50);
            }
        };
        window.addEventListener('navigate-to-highlight', handleNavigate);
        return () => window.removeEventListener('navigate-to-highlight', handleNavigate);
    }, [currentPage, onPageChange, jumpToPage, highlightPluginInstance]);

    // --- Render Helpers ---
    const handleDocumentLoad = (e: DocumentLoadEvent) => setNumPages(e.doc.numPages);
    const handlePageChange = (e: PageChangeEvent) => {
        if (isProgrammaticScrollRef.current) return;
        const pageIdx = (e as any).pageIndex ?? (e as any).pageNumber;
        if (pageIdx !== undefined) {
            const actualPage = pageIdx + 1;
            if (actualPage !== currentPage) { internalPageRef.current = actualPage; onPageChange(actualPage); }
        }
    };

    if (!isHydrated) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="glass" style={{
                height: '4rem', padding: '0 1.5rem', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderBottom: '1px solid var(--surface-border)', zIndex: 20, flexShrink: 0, gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ padding: '0.5rem', flexShrink: 0 }} title="Back to Dashboard"><ArrowLeft size={20} /></button>
                    <h2 style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '240px'
                    }} title={bookTitle}>{bookTitle}</h2>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem', borderRadius: 'var(--radius)', background: showIndex ? 'var(--primary-light)' : '', color: showIndex ? 'var(--primary)' : '', flexShrink: 0 }}
                        onClick={() => setShowIndex(!showIndex)}
                        title="Table of Contents"
                    >
                        <List size={16} />
                    </button>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', gap: '0.3rem', flexShrink: 0 }}
                        onClick={handleSaveBookmark}
                        disabled={isSavingBookmark}
                        title="Bookmark this page"
                    >
                        <Bookmark size={14} fill={isSavingBookmark ? "currentColor" : "none"} />
                        <span>{isSavingBookmark ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius)' }}>
                        <button onClick={() => { if (currentPage > 1) { isProgrammaticScrollRef.current = true; internalPageRef.current = currentPage - 1; jumpToPage(currentPage - 2); onPageChange(currentPage - 1); } }} className="btn btn-secondary" style={{ padding: '0.35rem' }}><ChevronLeft size={14} /></button>
                        <form onSubmit={(e) => { e.preventDefault(); const p = parseInt(pageInput, 10); if (!isNaN(p) && p >= 1 && (!numPages || p <= numPages)) { isProgrammaticScrollRef.current = true; internalPageRef.current = p; jumpToPage(p - 1); onPageChange(p); } }} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <input type="text" value={pageInput} onChange={e => setPageInput(e.target.value)} style={{ width: '32px', textAlign: 'center', background: 'transparent', border: 'none', fontWeight: 600, fontSize: '0.85rem' }} />
                            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>of {numPages || '...'}</span>
                        </form>
                        <button onClick={() => { if (numPages && currentPage < numPages) { isProgrammaticScrollRef.current = true; internalPageRef.current = currentPage + 1; jumpToPage(currentPage); onPageChange(currentPage + 1); } }} className="btn btn-secondary" style={{ padding: '0.35rem' }}><ChevronRight size={14} /></button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem', borderRadius: 'var(--radius)' }}>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem' }}
                                onClick={() => setScale((prev: number | SpecialZoomLevel) => typeof prev === 'number' ? Math.max(0.1, prev - 0.1) : 1.0)}
                                title="Zoom Out"
                                data-testid="zoom-out"
                            >
                                <ZoomOut size={14} />
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', minWidth: '3.5rem' }}
                                onClick={() => setScale(SpecialZoomLevel.PageWidth)}
                            >
                                Fit
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem' }}
                                onClick={() => setScale((prev: number | SpecialZoomLevel) => typeof prev === 'number' ? prev + 0.1 : 1.2)}
                                title="Zoom In"
                                data-testid="zoom-in"
                            >
                                <ZoomIn size={14} />
                            </button>
                        </div>
                        <button
                            className="btn btn-secondary"
                            style={{ padding: '0.45rem', borderRadius: 'var(--radius)' }}
                            onClick={handleToggleFullscreen}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '1.25rem', background: 'var(--surface-border)', opacity: 0.4 }} />

                    <Search>
                        {(renderSearchProps) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <div style={{ position: 'absolute', left: '8px', color: 'var(--muted-foreground)', display: 'flex' }}><SearchIcon size={12} /></div>
                                    <input
                                        type="text" className="input-field" placeholder="Search..."
                                        style={{ width: '150px', padding: '0.2rem 1.75rem 0.2rem 1.75rem', fontSize: '0.8rem', height: '28px' }}
                                        value={renderSearchProps.keyword}
                                        onChange={(e) => renderSearchProps.setKeyword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                if (renderSearchProps.keyword && renderSearchProps.numberOfMatches > 0) {
                                                    renderSearchProps.jumpToNextMatch();
                                                    adjustScrollOffset();
                                                } else if (renderSearchProps.keyword) {
                                                    renderSearchProps.search();
                                                }
                                            }
                                            e.stopPropagation();
                                        }}
                                    />
                                    {renderSearchProps.keyword && (
                                        <button onClick={renderSearchProps.clearKeyword} style={{ position: 'absolute', right: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={12} /></button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                                    <button onClick={() => { renderSearchProps.jumpToPreviousMatch(); adjustScrollOffset(); }} className="btn btn-secondary" style={{ padding: '0.35rem' }}><ChevronLeft size={14} /></button>
                                    <button onClick={() => { renderSearchProps.jumpToNextMatch(); adjustScrollOffset(); }} className="btn btn-secondary" style={{ padding: '0.35rem' }}><ChevronRight size={14} /></button>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', minWidth: '40px', textAlign: 'center', fontWeight: 500 }}>
                                    {renderSearchProps.numberOfMatches > 0 ? `${renderSearchProps.currentMatch}/${renderSearchProps.numberOfMatches}` : '0/0'}
                                </span>
                            </div>
                        )}
                    </Search>
                </div>
            </div>

            <div ref={viewerContainerRef} style={{ flex: 1, padding: '2rem', overflow: 'hidden', position: 'relative', background: 'transparent' }}>
                <div style={{ position: 'relative', width: '100%', height: '100%', maxWidth: '1200px', margin: '0 auto', boxShadow: 'var(--shadow-lg)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
                        <Viewer
                            fileUrl={pdfUrl}
                            initialPage={Math.max(0, currentPage - 1)}
                            plugins={[highlightPluginInstance, pageNavigationPluginInstance, scrollModePluginInstance, searchPluginInstance, bookmarkPluginInstance]}
                            onDocumentLoad={handleDocumentLoad}
                            onPageChange={handlePageChange}
                            defaultScale={scale}
                            scrollMode={ScrollMode.Vertical}
                        />
                    </Worker>
                </div>

                {isLoadingHighlights && (
                    <div className="glass" style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <div className="spinning" style={{ width: '1rem', height: '1rem', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        Loading highlights...
                    </div>
                )}

                {activeHighlightId && popoverPosition && createPortal(
                    <HighlightPopover
                        highlight={highlights.find(h => h.id === activeHighlightId)}
                        onClose={() => setActiveHighlightId(null)}
                        onDelete={handleDeleteHighlight}
                        onAddNote={handleAddNote}
                        onDeleteNote={handleDeleteNote}
                        containerStyle={{ left: `${popoverPosition.left}px`, top: `${popoverPosition.top}px` }}
                    />,
                    viewerContainerRef.current!
                )}
            </div>

            {showIndex && (
                <div className="glass" style={{
                    position: 'absolute',
                    top: '4rem',
                    bottom: 0,
                    left: 0,
                    width: '300px',
                    zIndex: 25,
                    borderRight: '1px solid var(--surface-border)',
                    overflow: 'auto',
                    padding: '1rem',
                    background: 'var(--background)',
                    boxShadow: '10px 0 30px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Table of Contents</h3>
                        <button onClick={() => setShowIndex(false)} className="btn btn-secondary" style={{ padding: '0.25rem' }}><X size={14} /></button>
                    </div>
                    <div className="rpv-bookmark__container" style={{ fontSize: '0.875rem' }}>
                        <Bookmarks />
                    </div>
                </div>
            )}
        </div>
    );
}
