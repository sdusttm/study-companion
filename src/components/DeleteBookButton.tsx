"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteBookButton({ bookId, bookTitle }: { bookId: string, bookTitle: string }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async (e: React.MouseEvent) => {
        // Prevent clicking the button from triggering the Link navigation wrapper
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm(`Are you sure you want to delete "${bookTitle}"?`)) {
            return;
        }

        setIsDeleting(true);

        try {
            const res = await fetch(`/api/books/${bookId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || "Failed to delete book");
            }

            // Refresh the page to remove the deleted book
            router.refresh();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to delete the book");
            setIsDeleting(false); // only reset if failed, on success router.refresh() handles the UI
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="delete-btn"
            title="Delete book"
            aria-label="Delete book"
        >
            {isDeleting ? <Loader2 size={16} className="spinning" /> : <Trash2 size={16} />}
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
                    color: #ef4444; /* red-500 */
                    background: rgba(239, 68, 68, 0.1);
                }
                .delete-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .spinning {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </button>
    );
}
