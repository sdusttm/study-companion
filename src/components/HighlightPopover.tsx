"use client";

import React, { useState } from "react";
import { X, Trash2, Check } from "lucide-react";

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

export function HighlightPopover({
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
    const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);
    const [confirmDeleteHighlight, setConfirmDeleteHighlight] = useState(false);

    const handleAdd = async () => {
        if (!newNote.trim()) return;
        setIsSaving(true);
        await onAddNote(highlight!.id, newNote.trim());
        setIsSaving(false);
        setIsAdding(false);
        setNewNote("");
    };

    const handleDeleteNoteClick = (highlightId: string, noteId: string) => {
        if (confirmDeleteNoteId !== noteId) {
            setConfirmDeleteNoteId(noteId);
            setTimeout(() => setConfirmDeleteNoteId(null), 3000);
            return;
        }
        onDeleteNote(highlightId, noteId);
        setConfirmDeleteNoteId(null);
    };

    const handleDeleteHighlightClick = (id: string) => {
        if (!confirmDeleteHighlight) {
            setConfirmDeleteHighlight(true);
            setTimeout(() => setConfirmDeleteHighlight(false), 3000);
            return;
        }
        onDelete(id);
        setConfirmDeleteHighlight(false);
    };

    if (!highlight) return null;

    return (
        <div style={{
            ...containerStyle,
            position: 'absolute',
            zIndex: 10000,
            pointerEvents: 'auto',
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px',
        }}>
            <div className="glass" style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                width: '260px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                border: '1.5px solid rgba(0, 0, 0, 0.12)',
                background: 'rgba(255, 255, 255, 0.98)',
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
                                    title="Delete Note"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNoteClick(highlight.id, note.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        background: confirmDeleteNoteId === note.id ? 'var(--destructive)' : 'transparent',
                                        border: 'none',
                                        color: confirmDeleteNoteId === note.id ? 'var(--destructive-foreground)' : 'var(--muted-foreground)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        padding: confirmDeleteNoteId === note.id ? '1px 4px' : '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        justifyContent: 'center',
                                        zIndex: 10,
                                        fontSize: '9px',
                                        fontWeight: 600
                                    }}
                                >
                                    {confirmDeleteNoteId === note.id ? (
                                        <div title="Confirm Delete" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                            <span>Delete?</span>
                                            <Check size={8} />
                                        </div>
                                    ) : <Trash2 size={10} />}
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
                            title="Delete Highlight"
                            className="btn btn-secondary"
                            style={{
                                padding: confirmDeleteHighlight ? '0.2rem 0.5rem' : '0.25rem',
                                borderRadius: confirmDeleteHighlight ? 'var(--radius-sm)' : '50%',
                                background: confirmDeleteHighlight ? 'var(--destructive)' : '',
                                color: confirmDeleteHighlight ? 'var(--destructive-foreground)' : 'var(--destructive)',
                                height: 'auto',
                                minHeight: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 600
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteHighlightClick(highlight.id);
                            }}
                        >
                            {confirmDeleteHighlight ? (
                                <div title="Confirm Delete" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>Delete?</span>
                                    <Check size={10} />
                                </div>
                            ) : <Trash2 size={12} />}
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

                <div style={{
                    position: 'absolute',
                    bottom: '-7px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '12px',
                    height: '12px',
                    background: '#fff',
                    borderRight: '1.5px solid rgba(0, 0, 0, 0.12)',
                    borderBottom: '1.5px solid rgba(0, 0, 0, 0.12)',
                    zIndex: -1
                }} />
            </div>
        </div>
    );
}
