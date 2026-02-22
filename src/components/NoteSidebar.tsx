"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function NoteSidebar({ bookId, currentPage }: { bookId: string; currentPage: number }) {
    const [activeTab, setActiveTab] = useState<"notes" | "bookmarks">("notes");
    const activeNoteRef = useRef<HTMLDivElement>(null);

    // Notes Status
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Bookmarks Status
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
    const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
    const [editBookmarkTitle, setEditBookmarkTitle] = useState("");
    const [isSavingBookmark, setIsSavingBookmark] = useState(false);

    const router = useRouter();

    const fetchBookmarks = () => {
        fetch(`/api/books/${bookId}/bookmarks`)
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

    useEffect(() => {
        fetch(`/api/books/${bookId}/notes`)
            .then(res => res.json())
            .then(data => {
                setNotes(data || []);
                setIsLoadingNotes(false);
            })
            .catch(err => {
                console.error("Failed to fetch notes:", err);
                setIsLoadingNotes(false);
            });

        fetchBookmarks();

        const handleBookmarkUpdated = () => fetchBookmarks();
        window.addEventListener("bookmark-added", handleBookmarkUpdated);

        return () => {
            window.removeEventListener("bookmark-added", handleBookmarkUpdated);
        };
    }, [bookId]);

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/notes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    bookId,
                    pageNumber: currentPage,
                    content: newNote.trim(),
                }),
            });

            if (res.ok) {
                const savedNote = await res.json();
                setNotes((prev) => [...prev, savedNote].sort((a, b) => a.pageNumber - b.pageNumber));
                setNewNote("");
                router.refresh(); // Just in case other components need freshness
            } else {
                alert("Failed to save note");
            }
        } catch (err) {
            console.error(err);
            alert("Error saving note");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (activeTab === "notes" && activeNoteRef.current && !isLoadingNotes) {
            activeNoteRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [currentPage, activeTab, isLoadingNotes, notes.length]);

    const notesByPage = useMemo(() => {
        const grouped = notes.reduce((acc, note) => {
            if (!acc[note.pageNumber]) {
                acc[note.pageNumber] = [];
            }
            acc[note.pageNumber].push(note);
            return acc;
        }, {} as Record<number, any[]>);
        return grouped;
    }, [notes]);

    const sortedPageNumbers = useMemo(() => {
        const pages = Object.keys(notesByPage).map(Number);
        if (!pages.includes(currentPage)) {
            pages.push(currentPage);
        }
        return pages.sort((a, b) => a - b);
    }, [notesByPage, currentPage]);

    const deleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setNotes(prev => prev.filter(n => n.id !== id));
            } else {
                alert("Failed to delete note");
            }
        } catch (err) {
            console.error(err);
            alert("Error deleting note");
        }
    };

    const deleteBookmark = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const res = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBookmarks(prev => prev.filter(b => b.id !== id));
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
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)', padding: '0.5rem', gap: '0.5rem', background: 'rgba(0,0,0,0.02)' }}>
                <button
                    onClick={() => setActiveTab("notes")}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)', background: activeTab === 'notes' ? 'var(--background)' : 'transparent', border: '1px solid', borderColor: activeTab === 'notes' ? 'var(--surface-border)' : 'transparent', boxShadow: activeTab === 'notes' ? 'var(--shadow-sm)' : 'none', fontWeight: activeTab === 'notes' ? 600 : 400, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', color: 'var(--foreground)' }}
                >
                    Notes
                </button>
                <button
                    onClick={() => setActiveTab("bookmarks")}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)', background: activeTab === 'bookmarks' ? 'var(--background)' : 'transparent', border: '1px solid', borderColor: activeTab === 'bookmarks' ? 'var(--surface-border)' : 'transparent', boxShadow: activeTab === 'bookmarks' ? 'var(--shadow-sm)' : 'none', fontWeight: activeTab === 'bookmarks' ? 600 : 400, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', color: 'var(--foreground)' }}
                >
                    Bookmarks {bookmarks.length > 0 && <span style={{ marginLeft: '4px', background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '999px' }}>{bookmarks.length}</span>}
                </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                {activeTab === 'notes' ? (
                    <>
                        <header style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>All Notes</p>
                        </header>

                        {isLoadingNotes ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flex: 1 }}>
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1rem' }}>
                                {sortedPageNumbers.length === 1 && sortedPageNumbers[0] === currentPage && notes.length === 0 ? (
                                    <div ref={activeNoteRef}>
                                        <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem' }}>
                                            No notes yet. Add one below to start!
                                        </p>
                                    </div>
                                ) : (
                                    sortedPageNumbers.map(page => {
                                        const pageNotes = notesByPage[page] || [];
                                        const isActive = page === currentPage;
                                        return (
                                            <div
                                                key={page}
                                                ref={isActive ? activeNoteRef : null}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                    padding: isActive ? '0.75rem' : '0',
                                                    background: isActive ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                                                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                                    borderRadius: isActive ? '0 var(--radius) var(--radius) 0' : '0',
                                                    transition: 'all 0.3s ease'
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
                                                    Page {page}
                                                    {isActive && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '999px', fontWeight: 'bold' }}>Current</span>}
                                                </h3>

                                                {pageNotes.length === 0 ? (
                                                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
                                                        No notes for this page.
                                                    </p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {pageNotes.map((note: any) => (
                                                            <div
                                                                key={note.id}
                                                                className="card hoverable"
                                                                onClick={() => {
                                                                    if (!isActive) {
                                                                        router.push(`?page=${page}`);
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    border: isActive ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--surface-border)',
                                                                    cursor: isActive ? 'default' : 'pointer'
                                                                }}
                                                            >
                                                                <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap', margin: 0 }}>{note.content}</p>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                                                                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                    <button
                                                                        className="btn btn-secondary"
                                                                        style={{ padding: '0.4rem', minHeight: 0, height: 'auto', color: 'var(--destructive)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        onClick={(e) => deleteNote(note.id, e)}
                                                                        title="Delete Note"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* Add Note Input Area */}
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '0.5rem' }}>
                            <textarea
                                className="input"
                                placeholder={`Add a note for Page ${currentPage}...`}
                                rows={3}
                                style={{ resize: 'none' }}
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveNote();
                                    }
                                }}
                            />
                            <button
                                className="btn btn-primary"
                                style={{ padding: '0.5rem', height: 'auto', alignSelf: 'stretch' }}
                                onClick={handleSaveNote}
                                disabled={isSaving || !newNote.trim()}
                                title="Save Note (Cmd/Ctrl + Enter)"
                            >
                                {isSaving ? <Loader2 className="spinning" size={16} /> : <Send size={16} />}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <header style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Your saved pages</p>
                        </header>

                        {isLoadingBookmarks ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flex: 1 }}>
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {bookmarks.length === 0 ? (
                                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem' }}>
                                        No bookmarks yet. Save a page using the button above!
                                    </p>
                                ) : (
                                    bookmarks.map(bookmark => (
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
                )}
            </div>
        </div>
    );
}
