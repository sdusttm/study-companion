"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createCustomCollisionDetection } from "@/lib/dnd-physics";
import { useRouter } from "next/navigation";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    useDroppable,
    pointerWithin,
    CollisionDetection,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, Calendar, Folder } from "lucide-react";
import { DeleteBookButton } from "@/components/DeleteBookButton";

export type LibraryItemType = "book" | "folder";

export interface LibraryItem {
    id: string;
    type: LibraryItemType;
    title: string;
    order: number;
    uploadedAt: Date;
}

interface LibraryGridProps {
    initialItems: LibraryItem[];
    currentFolderId?: string;
}

function RootDropzone() {
    const { isOver, setNodeRef } = useDroppable({ id: 'root-dropzone' });

    return (
        <div ref={setNodeRef} style={{
            background: isOver ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            border: isOver ? '2px dashed var(--primary)' : '2px dashed var(--border)',
            padding: '1.5rem',
            textAlign: 'center',
            borderRadius: 'var(--radius)',
            marginBottom: '1.5rem',
            color: isOver ? 'var(--primary)' : 'var(--muted-foreground)',
            transition: 'all 0.2s ease'
        }}>
            Drag here to move to library root
        </div>
    );
}

function FolderDropzone({ folderId }: { folderId: string }) {
    const { isOver, setNodeRef } = useDroppable({ id: `folder-drop-${folderId}` });

    return (
        <div ref={setNodeRef} style={{
            position: 'absolute',
            top: '5%',
            left: '5%',
            right: '5%',
            bottom: '5%',
            borderRadius: 'var(--radius)',
            background: isOver ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: isOver ? '2px dashed var(--primary)' : 'none',
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isOver ? 1 : 0,
            transition: 'all 0.2s ease',
        }}>
            {isOver && <span style={{
                color: 'var(--primary)',
                fontWeight: 'bold',
                background: 'var(--background)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                fontSize: '0.875rem'
            }}>Move In</span>}
        </div>
    );
}

function LibraryCardUI({ item, isOverlay }: { item: LibraryItem, isOverlay?: boolean }) {
    const router = useRouter();

    if (item.type === "folder") {
        return (
            <>
                <div
                    onClick={() => { if (!isOverlay) router.push(`/folder/${item.id}`) }}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, cursor: isOverlay ? 'grabbing' : 'pointer' }}
                >
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: isOverlay ? 'none' : 'blur(4px)',
                        height: '100px',
                        borderRadius: 'calc(var(--radius) - 4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        border: '1px solid var(--surface-border)',
                        willChange: isOverlay ? 'transform' : 'auto'
                    }}>
                        <Folder size={32} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.title}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            <Calendar size={12} />
                            {new Date(item.uploadedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                {!isOverlay && <FolderDropzone folderId={item.id} />}
            </>
        );
    }

    return (
        <>
            <div
                onClick={() => { if (!isOverlay) router.push(`/reader/${item.id}`) }}
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, cursor: isOverlay ? 'grabbing' : 'pointer' }}
            >
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: isOverlay ? 'none' : 'blur(4px)',
                    height: '100px',
                    borderRadius: 'calc(var(--radius) - 4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    border: '1px solid var(--surface-border)',
                    willChange: isOverlay ? 'transform' : 'auto'
                }}>
                    <FileText size={32} />
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                            {item.title}
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        <Calendar size={12} />
                        {new Date(item.uploadedAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
            {!isOverlay && (
                <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', zIndex: 10 }}>
                    <DeleteBookButton bookId={item.id} bookTitle={item.title} />
                </div>
            )}
        </>
    );
}

function SortableItem({ item }: { item: LibraryItem }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: { type: item.type }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, position: 'relative' }}
            {...attributes}
            {...listeners}
            className="card"
        >
            <LibraryCardUI item={item} />
        </div>
    );
}

export function LibraryGrid({ initialItems, currentFolderId }: LibraryGridProps) {
    const [items, setItems] = useState(initialItems);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Track the absolute physical pointer so we can re-awaken dnd-kit if the user freezes their hand
    const lastPointerRef = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const handler = (e: PointerEvent) => {
            lastPointerRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('pointermove', handler);
        return () => window.removeEventListener('pointermove', handler);
    }, []);

    // Time-delay buffer mapping targets to avoid layout "sneeze"
    const pendingSortRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require dragging a bit before capturing, allows click on DeleteBookButton to pass through
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const customCollisionDetection: CollisionDetection = useCallback(
        createCustomCollisionDetection(lastPointerRef, pendingSortRef),
        []
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(String(event.active.id));
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            let overIdStr = String(over.id);
            let isFolderDrop = false;
            if (overIdStr.startsWith('folder-drop-')) {
                overIdStr = overIdStr.replace('folder-drop-', '');
                isFolderDrop = true;
            }

            const activeItem = items.find(i => i.id === active.id);
            const overItem = items.find(i => i.id === overIdStr);

            if (activeItem?.type === 'book' && overItem?.type === 'folder' && isFolderDrop) {
                setItems(prevItems => prevItems.filter(i => i.id !== active.id));
                moveToFolder(active.id as string, overItem.id);
                return;
            }

            if (over.id === 'root-dropzone' && activeItem?.type === 'book') {
                setItems(prevItems => prevItems.filter(i => i.id !== active.id));
                moveToFolder(active.id as string, null);
                return;
            }

            setItems((prevItems) => {
                const oldIndex = prevItems.findIndex((i) => i.id === active.id);
                const newIndex = prevItems.findIndex((i) => i.id === over.id);

                const newItems = arrayMove(prevItems, oldIndex, newIndex);

                // Re-calculate orders based on array position
                // Lower index = lower order number
                const updatedItems = newItems.map((item, index) => ({
                    ...item,
                    order: index,
                }));

                // Fire off save in the background
                saveOrder(updatedItems);

                return updatedItems;
            });
        }
    };

    const moveToFolder = async (bookId: string, folderId: string | null) => {
        try {
            await fetch(`/api/books/${bookId}/move`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId }),
            });
        } catch (e) {
            console.error("Failed to move book", e);
        }
    };

    const saveOrder = async (newOrderedItems: LibraryItem[]) => {
        try {
            await fetch("/api/reorder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // send minimal data needed: id, type, order
                body: JSON.stringify({
                    items: newOrderedItems.map(item => ({ id: item.id, type: item.type, order: item.order }))
                }),
            });
        } catch (e) {
            console.error("Failed to save reorder", e);
        }
    };

    if (items.length === 0) {
        return (
            <div className="glass" style={{ textAlign: 'center', padding: '4rem', borderRadius: 'var(--radius)', border: '1px dashed var(--glass-border)' }}>
                <FileText size={48} style={{ margin: '0 auto', color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No books uploaded yet</h2>
                <p style={{ color: 'var(--muted-foreground)' }}>Upload your first PDF or create a folder to get started.</p>
            </div>
        );
    }

    return (
        <DndContext
            id="dnd-library-grid"
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {currentFolderId && <RootDropzone />}
            <SortableContext
                items={items.map(i => i.id)}
                strategy={rectSortingStrategy}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    {items.map((item) => (
                        <SortableItem key={item.id} item={item} />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
                duration: 250,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}>
                {activeId ? (
                    <div className="card" style={{ position: 'relative', cursor: 'grabbing', opacity: 1, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <LibraryCardUI
                            item={items.find(i => i.id === activeId)!}
                            isOverlay
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
