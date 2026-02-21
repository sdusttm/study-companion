"use client";

import { useState, useEffect } from "react";
import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export function NoteSidebar({ bookId, currentPage }: { bookId: string; currentPage: number }) {
    const [notes, setNotes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch(`/api/books/${bookId}/notes`)
            .then(res => res.json())
            .then(data => {
                setNotes(data || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch notes:", err);
                setIsLoading(false);
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

    return (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Notes</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>for Page {currentPage}</p>
            </header>

            {isLoading ? (
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
        </div>
    );
}
