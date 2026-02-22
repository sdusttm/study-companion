"use client";

import { useState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export function NoteSidebar({ bookId, currentPage }: { bookId: string; currentPage: number }) {
    const [activeTab, setActiveTab] = useState<"notes" | "bookmarks">("notes");

    // Notes Status
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Bookmarks Status
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);

    const router = useRouter();

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

    const pageNotes = notes.filter(n => n.pageNumber === currentPage);

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--surface-border)' }}>
                <button
                    onClick={() => setActiveTab("notes")}
                    style={{ flex: 1, padding: '1rem', background: activeTab === 'notes' ? 'var(--background)' : 'transparent', borderBottom: activeTab === 'notes' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'notes' ? 600 : 400 }}
                >
                    Notes
                </button>
                <button
                    onClick={() => setActiveTab("bookmarks")}
                    style={{ flex: 1, padding: '1rem', background: activeTab === 'bookmarks' ? 'var(--background)' : 'transparent', borderBottom: activeTab === 'bookmarks' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'bookmarks' ? 600 : 400 }}
                >
                    Bookmarks
                </button>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
                {activeTab === 'notes' ? (
                    <>
                        <header style={{ marginBottom: '1rem' }}>
                            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Notes for Page {currentPage}</p>
                        </header>

                        {isLoadingNotes ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', flex: 1 }}>
                                <Loader2 className="spinning" size={24} />
                            </div>
                        ) : (
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                                {pageNotes.length === 0 ? (
                                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem' }}>
                                        No notes for this page yet. Add one below!
                                    </p>
                                ) : (
                                    pageNotes.map(note => (
                                        <div key={note.id} className="card" style={{ padding: '1rem' }}>
                                            <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem', textAlign: 'right' }}>
                                                {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    ))
                                )}

                                {notes.length > 0 && pageNotes.length === 0 && (
                                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginTop: 'auto', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                                        You have {notes.length} note{notes.length === 1 ? '' : 's'} on other pages.
                                    </p>
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
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
                                            style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: currentPage === bookmark.pageNumber ? '1px solid var(--primary)' : undefined }}
                                            onClick={() => router.push(`?page=${bookmark.pageNumber}`)}
                                        >
                                            <div>
                                                <p style={{ fontWeight: 500, margin: 0 }}>{bookmark.title}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>Page {bookmark.pageNumber}</p>
                                            </div>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', minHeight: 0, height: 'auto', fontSize: '0.75rem' }}
                                                onClick={(e) => deleteBookmark(bookmark.id, e)}
                                            >
                                                Delete
                                            </button>
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
