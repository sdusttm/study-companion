"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Edit2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function RenameFolderModal({
    folderId,
    currentName,
    variant = "icon"
}: {
    folderId: string;
    currentName: string;
    variant?: "icon" | "button";
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [newName, setNewName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setNewName(currentName);
        setIsOpen(true);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsOpen(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!newName.trim() || newName.trim() === currentName) {
            handleClose();
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(`/api/folder/${folderId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: newName.trim() }),
            });

            if (!res.ok) throw new Error("Failed to rename folder");

            handleClose();
            router.refresh(); // Refresh page to reflect new name
        } catch (error) {
            console.error("Error renaming folder:", error);
            alert("Failed to rename folder.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {variant === "icon" ? (
                <button
                    onClick={handleOpen}
                    className="btn btn-secondary action-btn"
                    style={{
                        padding: "0.5rem",
                        color: "var(--muted-foreground)",
                        background: "var(--background)",
                        border: "1px solid var(--surface-border)",
                        borderRadius: "var(--radius)",
                        boxShadow: "var(--shadow-sm)",
                        cursor: "pointer",
                        width: "36px",
                        height: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                    }}
                    title="Rename Folder"
                >
                    <Edit2 size={16} />
                </button>
            ) : (
                <button onClick={handleOpen} className="btn btn-secondary">
                    <Edit2 size={16} style={{ marginRight: "0.5rem" }} /> Rename Folder
                </button>
            )}

            {mounted &&
                isOpen &&
                createPortal(
                    <div className="modal-backdrop" onClick={handleClose}>
                        <div
                            className="modal-content animate-in"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Rename Folder</h2>
                                <button
                                    className="close-button"
                                    onClick={handleClose}
                                    aria-label="Close modal"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div style={{ marginBottom: "1rem" }}>
                                        <label
                                            htmlFor="folderName"
                                            style={{
                                                display: "block",
                                                marginBottom: "0.5rem",
                                                color: "var(--muted-foreground)",
                                                fontSize: "0.875rem",
                                            }}
                                        >
                                            Folder Name
                                        </label>
                                        <input
                                            id="folderName"
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="input-field"
                                            autoFocus
                                            disabled={isSaving}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleClose}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isSaving || !newName.trim() || newName.trim() === currentName}
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2
                                                    size={16}
                                                    className="spinning"
                                                    style={{ marginRight: "8px" }}
                                                />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Changes"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
