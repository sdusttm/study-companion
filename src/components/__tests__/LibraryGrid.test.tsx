import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LibraryGrid } from '../LibraryGrid';
import { useRouter } from 'next/navigation';
import { LibraryItem } from '../LibraryGrid';

let dndContextProps: any;
jest.mock('@dnd-kit/core', () => {
    const original = jest.requireActual('@dnd-kit/core');
    return {
        ...original,
        DndContext: (props: any) => {
            dndContextProps = props;
            return <div data-testid="dnd-context">{props.children}</div>;
        }
    };
});

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

describe('LibraryGrid component regression tests', () => {
    let mockRouterRefresh: jest.Mock;

    const mockItems: LibraryItem[] = [
        { id: 'folder-1', type: 'folder', title: 'Folder 1', order: 0, uploadedAt: new Date(), itemCount: 2 },
        { id: 'book-1', type: 'book', title: 'Book 1', order: 1, uploadedAt: new Date() },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockRouterRefresh = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            refresh: mockRouterRefresh,
            push: jest.fn()
        });

        global.fetch = jest.fn() as jest.Mock;
    });

    it('renders initial items correctly', () => {
        render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        expect(screen.getByText('Folder 1')).toBeInTheDocument();
        expect(screen.getByText('Book 1')).toBeInTheDocument();
    });

    it('synchronizes internal state when initialItems prop changes from the server', () => {
        const { rerender } = render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        expect(screen.getByText('Book 1')).toBeInTheDocument();

        // Simulate a navigation/server refresh that passes down new initialItems
        // For instance, if Book 1 was moved into a folder, it won't be in the new initialItems
        const newItems: LibraryItem[] = [
            { id: 'folder-1', type: 'folder', title: 'Folder 1', order: 0, uploadedAt: new Date(), itemCount: 3 },
        ];

        rerender(<LibraryGrid initialItems={newItems} currentFolderId={undefined} />);

        // The old book should be gone because LibraryGrid synced its internal state
        expect(screen.queryByText('Book 1')).not.toBeInTheDocument();
        // The folder with its updated state should remain
        expect(screen.getByText('Folder 1')).toBeInTheDocument();
    });

    it('makes API call and calls router.refresh on successfully moving a book to a folder', async () => {
        render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        expect(screen.getByText('Folder 1')).toBeInTheDocument();
        expect(screen.getByText('Book 1')).toBeInTheDocument();

        // Ensure fetch returns ok for the move
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({}),
        });

        // Trigger the drop via the captured DndContext props
        await act(async () => {
            await dndContextProps.onDragEnd({
                active: { id: 'book-1' },
                over: { id: 'folder-drop-folder-1' }
            });
        });

        // 1. Verify the optimistic UI update hides the book
        expect(screen.queryByText('Book 1')).not.toBeInTheDocument();

        // 2. Verify the API request was made
        expect(global.fetch).toHaveBeenCalledWith('/api/books/book-1/move', expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ folderId: 'folder-1' })
        }));

        // 3. Verify router.refresh gets called to sync server state
        expect(mockRouterRefresh).toHaveBeenCalled();
    });
});
