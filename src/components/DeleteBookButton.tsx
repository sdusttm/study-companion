"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteBookButton({ bookId, bookTitle }: { bookId: string, bookTitle: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleInitialClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(true);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowModal(false);
    };

    const handleConfirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDeleting(true);

        try {
            const res = await fetch(`/api/books/${bookId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || "Failed to delete book");
            }

            setShowModal(false);
            router.refresh();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to delete the book");
            setIsDeleting(false);
        }
    };

    return (
        <>
            <button
                onClick={handleInitialClick}
                disabled={isDeleting}
                className="delete-btn"
                title="Delete book"
                aria-label="Delete book"
            >
                {isDeleting ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
            </button>

            {mounted && showModal && createPortal(
                <div className="modal-backdrop" onClick={handleCancel}>
                    <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-icon-container">
                                <AlertTriangle size={24} className="warning-icon" />
                            </div>
                            <button className="close-btn" onClick={handleCancel}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <h3>Delete Book</h3>
                            <p>Are you sure you want to delete <strong>"{bookTitle}"</strong>?</p>
                            <p className="text-muted">This action is permanent and cannot be undone.</p>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={handleCancel}
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={16} className="spinning" style={{ marginRight: '8px' }} />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Permanently'
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <style jsx>{`
                .delete-btn {
                    background: transparent;
                    border: none;
                    color: var(--muted-foreground);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: var(--radius);
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .delete-btn:hover {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.1);
                }
                .delete-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Modal Styles */
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }
                .modal-content {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: calc(var(--radius) + 4px);
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }
                .animate-in {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    padding: 1.5rem 1.5rem 0.5rem;
                }
                .modal-icon-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(239, 68, 68, 0.1);
                }
                .warning-icon {
                    color: #ef4444;
                }
                .close-btn {
                    background: transparent;
                    border: none;
                    color: var(--muted-foreground);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: var(--radius);
                    display: flex;
                }
                .close-btn:hover {
                    background: var(--accent);
                    color: var(--foreground);
                }
                .modal-body {
                    padding: 0.5rem 1.5rem 1.5rem;
                }
                .modal-body h3 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                .modal-body p {
                    margin: 0;
                    color: var(--foreground);
                    line-height: 1.5;
                }
                .modal-body .text-muted {
                    color: var(--muted-foreground);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }
                .modal-footer {
                    padding: 1rem 1.5rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    background: var(--card);
                    border-top: 1px solid var(--border);
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border-radius: var(--radius);
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-secondary {
                    background: var(--accent);
                    color: var(--foreground);
                    border: 1px solid var(--border);
                }
                .btn-secondary:hover:not(:disabled) {
                    background: var(--border);
                }
                .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                .btn-danger:hover:not(:disabled) {
                    background: #dc2626;
                }
                .spinning {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </>
    );
}
