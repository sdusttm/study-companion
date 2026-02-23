import { createCustomCollisionDetection } from '../../lib/dnd-physics';

// Mock dnd-kit closestCenter
jest.mock('@dnd-kit/core', () => ({
    closestCenter: jest.fn((args: any) => {
        // Simple mock: if there are sortable containers, return the first one as closest
        const sortables = args.droppableContainers.filter((c: any) => !String(c.id).startsWith('folder-drop-'));
        return sortables.length > 0 ? [sortables[0]] : [];
    })
}));

describe('Drag and Drop Physics Engine', () => {
    let lastPointerRef: { current: { x: number, y: number } };
    let pendingSortRef: { current: { id: string | null; time: number } };
    let physicsEngine: any;

    beforeEach(() => {
        lastPointerRef = { current: { x: 0, y: 0 } };
        pendingSortRef = { current: { id: null, time: 0 } };
        physicsEngine = createCustomCollisionDetection(lastPointerRef as any, pendingSortRef as any);

        // Reset timers
        jest.useFakeTimers();
        const now = 10000;
        jest.spyOn(Date, 'now').mockReturnValue(now);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        (window as any)._dndTimeout = null;
    });

    const createMockArgs = (activeCenter: { x: number, y: number }) => {
        return {
            active: { id: 'active-book', data: { current: { type: 'book' } } },
            collisionRect: {
                // To get activeCenter = {x, y}, we just reverse the math (center = left + width/2)
                left: activeCenter.x - 50,
                top: activeCenter.y - 50,
                width: 100,
                height: 100,
            },
            droppableContainers: [
                {
                    id: 'folder-1',
                    data: { current: { type: 'folder' } },
                    rect: {
                        current: {
                            left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000
                        }
                    }
                },
                {
                    id: 'folder-drop-folder-1',
                    data: { current: { type: 'folder-dropzone' } },
                    rect: {
                        current: {
                            left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000
                        }
                    }
                }
            ]
        };
    };

    it('returns the folder dropzone when the book center is exactly in the inner 85% core', () => {
        // Folder is 1000x1000 at (0,0). 
        // 85% zone is width 850, height 850, centered.
        // Left bound: (1000 - 850)/2 = 75. Right bound = 925.
        // Center of folder is (500, 500), which is well within [75, 925].
        const args = createMockArgs({ x: 500, y: 500 });

        const result = physicsEngine(args);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('folder-drop-folder-1');
    });

    it('blocks the layout shift (returns []) when book center is in the outer 7.5% margin and time < 400ms', () => {
        // Book center at x=50. Left bound of move-in zone is 75. 
        // So x=50 is in the left sorting margin.
        const args = createMockArgs({ x: 50, y: 500 });

        // Initial entry
        const result = physicsEngine(args);

        expect(result).toEqual([]); // Blocked!
        expect(pendingSortRef.current.id).toBe('folder-1');
        expect(pendingSortRef.current.time).toBe(10000); // Recorded entry time
    });

    it('allows the layout shift (returns closest container) when cursor lingers in margin for > 400ms', () => {
        const args = createMockArgs({ x: 50, y: 500 });

        // First entry starts the clock
        physicsEngine(args);

        // Advance time by 500ms
        jest.spyOn(Date, 'now').mockReturnValue(10500);

        // Re-evaluate
        const result2 = physicsEngine(args);

        // It successfully returns the container to shuffle the list!
        expect(result2).toHaveLength(1);
        expect(result2[0].id).toBe('folder-1');
    });

    it('dispatches a fake pointermove event if the layout shift is blocked to keep dnd-kit alive', () => {
        const args = createMockArgs({ x: 50, y: 500 });
        lastPointerRef.current = { x: 999, y: 888 };

        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

        // Initial entry
        physicsEngine(args);

        // Fast forward the timeouts
        jest.advanceTimersByTime(400);

        expect(dispatchSpy).toHaveBeenCalled();
        const dispatchedEvent = dispatchSpy.mock.calls[0][0] as any;
        expect(dispatchedEvent.type).toBe('pointermove');
        expect(dispatchedEvent.clientX).toBe(999);
        expect(dispatchedEvent.clientY).toBe(888);
    });
});
