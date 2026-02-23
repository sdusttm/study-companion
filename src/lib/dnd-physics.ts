import { CollisionDetection, closestCenter } from '@dnd-kit/core';
import { MutableRefObject } from 'react';

export const createCustomCollisionDetection = (
    lastPointerRef: MutableRefObject<{ x: number, y: number }>,
    pendingSortRef: MutableRefObject<{ id: string | null; time: number }>
): CollisionDetection => (args) => {
    const activeType = args.active?.data?.current?.type;

    if (activeType === 'book') {
        const activeRect = args.collisionRect;
        const activeCenter = {
            x: activeRect.left + activeRect.width / 2,
            y: activeRect.top + activeRect.height / 2,
        };

        const folders = args.droppableContainers.filter(c =>
            !String(c.id).startsWith('folder-drop-') && c.data?.current?.type === 'folder'
        );

        for (const folder of folders) {
            const rect = folder.rect.current;
            if (!rect) continue;

            const zoneWidth = rect.width * 0.85;
            const zoneHeight = rect.height * 0.85;
            const zoneLeft = rect.left + (rect.width - zoneWidth) / 2;
            const zoneRight = zoneLeft + zoneWidth;
            const zoneTop = rect.top + (rect.height - zoneHeight) / 2;
            const zoneBottom = zoneTop + zoneHeight;

            if (
                activeCenter.x >= zoneLeft &&
                activeCenter.x <= zoneRight &&
                activeCenter.y >= zoneTop &&
                activeCenter.y <= zoneBottom
            ) {
                const dropzoneId = `folder-drop-${folder.id}`;
                const dropzone = args.droppableContainers.find(c => c.id === dropzoneId);
                if (dropzone) {
                    return [dropzone as any];
                }
            }
        }
    }

    const sortableArgs = {
        ...args,
        droppableContainers: args.droppableContainers.filter(
            (c) => !String(c.id).startsWith('folder-drop-')
        )
    };

    const closest = closestCenter(sortableArgs);

    if (closest.length > 0) {
        const targetId = String(closest[0].id);

        if (targetId === String(args.active.id)) {
            pendingSortRef.current = { id: null, time: 0 };
            return closest;
        }

        if (pendingSortRef.current.id !== targetId) {
            pendingSortRef.current = { id: targetId, time: Date.now() };
        }

        if (Date.now() - pendingSortRef.current.time < 400) {
            const timeoutKey = (window as any)._dndTimeout;
            if (!timeoutKey) {
                (window as any)._dndTimeout = setTimeout(() => {
                    const { x, y } = lastPointerRef.current;
                    const event = new Event('pointermove', { bubbles: true });
                    Object.assign(event, { clientX: x, clientY: y });
                    window.dispatchEvent(event);
                    (window as any)._dndTimeout = null;
                }, 400);
            }
            return [];
        }
    } else {
        pendingSortRef.current = { id: null, time: 0 };
    }

    return closest;
};
