"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";

export function CreateFolderButton({ onFolderCreated }: { onFolderCreated: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/folders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (res.ok) {
                setName("");
                setIsOpen(false);
                onFolderCreated();
            } else {
                console.error("Failed to create folder");
            }
        } catch (error) {
            console.error("Error creating folder:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="glass"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius)',
                    color: 'var(--foreground)',
                    background: 'var(--surface)',
                    border: '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                }}
            >
                <FolderPlus size={16} />
                New Folder
            </button>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Folder Name"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setIsOpen(false);
                }}
                style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--surface-border)',
                    background: 'var(--background)',
                    color: 'var(--foreground)',
                    fontSize: '0.875rem'
                }}
                disabled={loading}
            />
            <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius)',
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    border: 'none',
                    cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    opacity: loading || !name.trim() ? 0.5 : 1
                }}
            >
                Create
            </button>
            <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius)',
                    background: 'transparent',
                    color: 'var(--muted-foreground)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                }}
            >
                Cancel
            </button>
        </div>
    );
}
