"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Bookmark {
    id: string;
    pageNumber: number;
    title: string;
}

interface Highlight {
    id: string;
    pageNumber: number;
    content: string;
    comment?: string;
    color?: string;
    createdAt: string;
}

export function NoteSidebar({ bookId, currentPage }: { bookId: string; currentPage: number }) {
    const [activeTab, setActiveTab] = useState<"bookmarks" | "highlights">("highlights");
    const activeHighlightRef = useRef<HTMLDivElement>(null);

    // Bookmarks Status
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
    const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
    const [editBookmarkTitle, setEditBookmarkTitle] = useState("");
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);

    // Highlights Status
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

    // Inline Note Editing Status
    const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
    const [editHighlightComment, setEditHighlightComment] = useState("");
    const [isSavingHighlight, setIsSavingHighlight] = useState(false);

    // Filters
    const [showNotesOnly, setShowNotesOnly] = useState(true);

    const router = useRouter();
    const fetchBookmarks = () => {
        fetch(`/api/books/${bookId}/bookmarks`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setBookmarks(data.bookmarks || []);
                setIsLoadingBookmarks(false);
            })
            .catch(err => {
                console.error("Failed to fetch bookmarks:", err);
                setIsLoadingBookmarks(false);
            });
    };

    const fetchHighlights = () => {
        fetch(`/api/books/${bookId}/highlights`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                setHighlights(Array.isArray(data) ? data : []);
                setIsLoadingHighlights(false);
            })
            .catch(err => {
                console.error("Failed to fetch highlights:", err);
                setIsLoadingHighlights(false);
            });
    };

    useEffect(() => {
        if (!bookId) return;

        fetchBookmarks();
        fetchHighlights();
        const handleBookmarkUpdated = () => fetchBookmarks();

        const handleHighlightUpdated = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.id) {
                setHighlights(prev => [...prev, customEvent.detail]);
            } else {
                fetchHighlights();
            }
        };

        window.addEventListener("bookmark-added", handleBookmarkUpdated);
        window.addEventListener("highlight-added", handleHighlightUpdated);

        return () => {
            window.removeEventListener("bookmark-added", handleBookmarkUpdated);
            window.removeEventListener("highlight-added", handleHighlightUpdated);
        };
    }, [bookId]);

    // Handle clicks directly on the PDF highlights
    useEffect(() => {
        const handleEditHighlightClicked = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.id) {
                setActiveTab("highlights");
                setEditingHighlightId(customEvent.detail.id);

                // Allow state and DOM to update, then scroll the sidebar to show the opened textbox
                setTimeout(() => {
                    const targetEl = document.getElementById(`highlight-card-${customEvent.detail.id}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
            }
        };

        window.addEventListener('edit-highlight', handleEditHighlightClicked);
        return () => window.removeEventListener('edit-highlight', handleEditHighlightClicked);
    }, []);

    const handleSaveHighlightComment = async (id: string, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editHighlightComment.trim() && !highlights.find(h => h.id === id)?.comment) return;

        setIsSavingHighlight(true);
        try {
            const res = await fetch(`/api/highlights/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ comment: editHighlightComment.trim() }),
            });

            if (res.ok) {
                const saved = await res.json();
                setHighlights((prev) => prev.map(h => h.id === id ? { ...h, comment: saved.comment } : h));
                setEditingHighlightId(null);
                setEditHighlightComment("");
            } else {
                alert("Failed to save note");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingHighlight(false);
        }
    };

    // Scroll active highlight into view
    useEffect(() => {
        if (activeTab === "highlights" && activeHighlightRef.current && !isLoadingHighlights) {
            activeHighlightRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [currentPage, activeTab, isLoadingHighlights, highlights.length]);

    const highlightsByPage = useMemo(() => {
        return highlights
            .filter(highlight => showNotesOnly ? !!highlight.comment : true)
            .reduce((acc, highlight) => {
                if (!acc[highlight.pageNumber]) {
                    acc[highlight.pageNumber] = [];
                }
                acc[highlight.pageNumber].push(highlight);
                return acc;
            }, {} as Record<number, Highlight[]>);
    }, [highlights, showNotesOnly]);

    const sortedHighlightPages = useMemo(() => {
        const pages = Object.keys(highlightsByPage).map(Number);
        if (!pages.includes(currentPage)) {
            pages.push(currentPage);
        }
        return pages.sort((a, b) => a - b);
    }, [highlightsByPage, currentPage]);

    const deleteBookmark = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBookmarks(prev => prev.filter(b => b.id !== id));
                window.dispatchEvent(new CustomEvent('bookmark-updated'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteHighlight = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/highlights/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setHighlights(prev => prev.filter(h => h.id !== id));
                // Dispatch event to update PDF viewer layer immediately 
                window.dispatchEvent(new CustomEvent('highlight-deleted', { detail: { id } }));
            } else {
                alert("Failed to delete highlight");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRenameBookmark = async (id: string, e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editBookmarkTitle.trim()) return;

        setIsSavingBookmark(true);
        try {
            const res = await fetch(`/api/bookmarks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editBookmarkTitle })
            });
            if (res.ok) {
                const updated = await res.json();
                setBookmarks(prev => prev.map(b => b.id === id ? { ...b, title: updated.bookmark.title } : b));
                setEditingBookmarkId(null);
                window.dispatchEvent(new CustomEvent('bookmark-updated'));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingBookmark(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0.5rem', gap: '0.5rem', background: 'rgba(0,0,0,0.02)', flexShrink: 0 }}>
                <button
                    onClick={() => setActiveTab("highlights")}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)', background: activeTab === 'highlights' ? 'var(--background)' : 'transparent', border: '1px solid', borderColor: activeTab === 'highlights' ? 'var(--surface-border)' : 'transparent', boxShadow: activeTab === 'highlights' ? 'var(--shadow-sm)' : 'none', fontWeight: 600, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', color: 'var(--foreground)' }}
                >
                    Annotations {highlights.length > 0 && <span style={{ marginLeft: '4px', background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '999px' }}>{highlights.length}</span>}
                </button>
                <button
                    onClick={() => setActiveTab("bookmarks")}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)', background: activeTab === 'bookmarks' ? 'var(--background)' : 'transparent', border: '1px solid', borderColor: activeTab === 'bookmarks' ? 'var(--surface-border)' : 'transparent', boxShadow: activeTab === 'bookmarks' ? 'var(--shadow-sm)' : 'none', fontWeight: activeTab === 'bookmarks' ? 600 : 400, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', color: 'var(--foreground)' }}
                >
                    Bookmarks {bookmarks.length > 0 && <span style={{ marginLeft: '4px', background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '999px' }}>{bookmarks.length}</span>}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {activeTab === 'bookmarks' ? (
                    <>
                        <div style={{ padding: '1.5rem 1.5rem 0', flexShrink: 0 }}>
                            <header style={{ marginBottom: '1rem' }}>
                                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Your saved pages</p>
                            </header>
                        </div>

                        {isLoadingBookmarks ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flex: 1 }}>
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
                                {bookmarks.length === 0 ? (
                                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem' }}>
                                        No bookmarks yet. Save a page using the button above!
                                    </p>
                                ) : (
                                    bookmarks.map((bookmark: Bookmark) => (
                                        <div
                                            key={bookmark.id}
                                            className="card hoverable"
                                            style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer', border: currentPage === bookmark.pageNumber ? '1px solid var(--primary)' : undefined }}
                                            onClick={() => router.push(`?page=${bookmark.pageNumber}`)}
                                        >
                                            {editingBookmarkId === bookmark.id ? (
                                                <form onSubmit={(e) => handleRenameBookmark(bookmark.id, e)} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                                    <input
                                                        autoFocus
                                                        value={editBookmarkTitle}
                                                        onChange={e => setEditBookmarkTitle(e.target.value)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="input-field"
                                                        style={{ padding: '0.25rem 0.5rem', flex: 1, minHeight: 0 }}
                                                        disabled={isSavingBookmark}
                                                    />
                                                    <button type="submit" disabled={isSavingBookmark || !editBookmarkTitle.trim()} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }} onClick={e => e.stopPropagation()}>Save</button>
                                                    <button type="button" disabled={isSavingBookmark} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setEditingBookmarkId(null); }}>Cancel</button>
                                                </form>
                                            ) : (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <p style={{ fontWeight: 500, margin: 0 }}>{bookmark.title}</p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>Page {bookmark.pageNumber}</p>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingBookmarkId(bookmark.id);
                                                                setEditBookmarkTitle(bookmark.title);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: '0.4rem', minHeight: 0, height: 'auto', color: 'var(--destructive)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            onClick={(e) => deleteBookmark(bookmark.id, e)}
                                                            title="Delete Bookmark"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                ) : activeTab === 'highlights' ? (
                    <>
                        <div style={{ padding: '1rem 1.5rem 1rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                                Your text highlights
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: showNotesOnly ? 'var(--foreground)' : 'var(--muted-foreground)', fontWeight: showNotesOnly ? 500 : 400, transition: 'color 0.2s', lineHeight: 1, display: 'flex', alignItems: 'center' }}>Notes Only</span>
                                <div style={{
                                    position: 'relative',
                                    width: '36px',
                                    height: '20px',
                                    borderRadius: '999px',
                                    background: showNotesOnly ? 'var(--primary)' : 'var(--muted)',
                                    transition: 'background 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '2px',
                                    boxSizing: 'border-box'
                                }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        background: 'white',
                                        borderRadius: '50%',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                        transform: `translateX(${showNotesOnly ? '16px' : '0px'})`,
                                        transition: 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                    }} />
                                    <input
                                        type="checkbox"
                                        checked={showNotesOnly}
                                        onChange={(e) => setShowNotesOnly(e.target.checked)}
                                        style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0, left: 0, top: 0 }}
                                    />
                                </div>
                            </label>
                        </div>

                        {isLoadingHighlights ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flex: 1 }}>
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
                                {sortedHighlightPages.length === 1 && sortedHighlightPages[0] === currentPage && highlights.length === 0 ? (
                                    <div ref={activeHighlightRef} style={{ scrollMarginTop: '1rem' }}>
                                        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
                                            No notes yet. Select text in the PDF to create one!
                                        </p>
                                    </div>
                                ) : (
                                    sortedHighlightPages.map(pageNum => {
                                        const isActive = pageNum === currentPage;
                                        return (
                                            <div
                                                key={`highlight-page-${pageNum}`}
                                                ref={isActive ? activeHighlightRef : null}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 0.75rem',
                                                    background: isActive ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                                                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                                    borderRadius: '0 var(--radius) var(--radius) 0',
                                                    transition: 'background 0.3s ease, border-color 0.3s ease',
                                                    scrollMarginTop: '0.5rem'
                                                }}
                                            >
                                                <h3 style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    color: isActive ? 'var(--primary)' : 'var(--muted-foreground)',
                                                    margin: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    Page {pageNum}
                                                    {isActive && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '999px', fontWeight: 'bold' }}>Current</span>}
                                                </h3>
                                                {highlightsByPage[pageNum] && highlightsByPage[pageNum].length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {highlightsByPage[pageNum].map((highlight: Highlight) => (
                                                            <div
                                                                key={highlight.id}
                                                                className="card hoverable"
                                                                onClick={() => {
                                                                    window.dispatchEvent(new CustomEvent('navigate-to-highlight', { detail: { highlightId: highlight.id } }));
                                                                }}
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    borderTop: currentPage === highlight.pageNumber ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--surface-border)',
                                                                    borderRight: currentPage === highlight.pageNumber ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--surface-border)',
                                                                    borderBottom: currentPage === highlight.pageNumber ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--surface-border)',
                                                                    cursor: 'pointer',
                                                                    borderLeft: `4px solid ${{
                                                                        'yellow': 'rgba(255, 226, 143, 0.8)',
                                                                        'green': 'rgba(172, 236, 172, 0.8)',
                                                                        'blue': 'rgba(164, 203, 255, 0.8)',
                                                                        'pink': 'rgba(255, 179, 217, 0.8)',
                                                                        'purple': 'rgba(219, 185, 255, 0.8)'
                                                                    }[highlight.color || 'yellow'] || 'rgba(255, 226, 143, 0.8)'
                                                                        }`
                                                                }}
                                                            >
                                                                <p style={{ fontSize: '0.875rem', fontStyle: 'italic', margin: 0, color: 'var(--foreground)' }}>
                                                                    &quot;{highlight.content}&quot;
                                                                </p>

                                                                {editingHighlightId === highlight.id ? (
                                                                    <form onSubmit={(e) => handleSaveHighlightComment(highlight.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', width: '100%' }}>
                                                                        <textarea
                                                                            autoFocus
                                                                            value={editHighlightComment}
                                                                            onChange={e => setEditHighlightComment(e.target.value)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    handleSaveHighlightComment(highlight.id);
                                                                                }
                                                                            }}
                                                                            className="input-field"
                                                                            placeholder="Add your note..."
                                                                            style={{ padding: '0.5rem', flex: 1, minHeight: '60px', width: '100%', resize: 'vertical', fontSize: '0.875rem', borderRadius: 'var(--radius)' }}
                                                                            disabled={isSavingHighlight}
                                                                        />
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                            <button type="button" disabled={isSavingHighlight} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setEditingHighlightId(null); }}>Cancel</button>
                                                                            <button type="submit" disabled={isSavingHighlight} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }} onClick={e => e.stopPropagation()}>Save</button>
                                                                        </div>
                                                                    </form>
                                                                ) : highlight.comment ? (
                                                                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--surface-border)' }}>
                                                                        <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0, color: 'var(--foreground)' }}>{highlight.comment}</p>
                                                                    </div>
                                                                ) : null}

                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                                        {new Date(highlight.createdAt).toLocaleDateString()}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        {editingHighlightId !== highlight.id && (
                                                                            <button
                                                                                className="btn btn-secondary"
                                                                                style={{ padding: '0.25rem 0.6rem', minHeight: 0, height: 'auto', fontSize: '0.75rem', borderRadius: '999px' }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingHighlightId(highlight.id);
                                                                                    setEditHighlightComment(highlight.comment || "");
                                                                                }}
                                                                            >
                                                                                {highlight.comment ? "Edit Note" : "+ Add Note"}
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="btn btn-secondary"
                                                                            style={{ padding: '0.4rem', minHeight: 0, height: 'auto', color: 'var(--destructive)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            onClick={(e) => deleteHighlight(highlight.id, e)}
                                                                            title="Delete Highlight"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
                                                        No highlights for this page.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
