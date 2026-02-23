import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NoteSidebar } from '../NoteSidebar';
import { useRouter } from 'next/navigation';

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock global alert
const mockAlert = jest.fn();
global.alert = mockAlert;

describe('NoteSidebar component', () => {
    let mockRouterRefresh: jest.Mock;

    const mockHighlights = [
        { id: 'h1', pageNumber: 1, content: 'Test highlight 1', comment: 'Test note 1', createdAt: '2023-01-01T00:00:00Z', color: 'yellow' },
        { id: 'h2', pageNumber: 2, content: 'Test highlight 2', comment: '', createdAt: '2023-01-02T00:00:00Z', color: 'green' },
    ];

    const mockBookmarks = [
        { id: 'b1', pageNumber: 5, title: 'Test Bookmark' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock scrollIntoView since jsdom doesn't implement it
        window.HTMLElement.prototype.scrollIntoView = jest.fn();

        mockRouterRefresh = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            refresh: mockRouterRefresh,
            push: jest.fn()
        });

        global.fetch = jest.fn((url) => {
            if (url.includes('/bookmarks')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ bookmarks: mockBookmarks }),
                });
            }
            if (url.includes('/highlights')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockHighlights),
                });
            }
            return Promise.reject(new Error('Unknown target API url'));
        }) as jest.Mock;
    });

    it('fetches and renders highlights on initial load', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        // Highlights are active tab by default
        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // Assert mock fetch was called for both
        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/bookmarks', expect.any(Object));
        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/highlights', expect.any(Object));
    });

    it('filters out empty highlights when Notes Only is active, and shows them when toggled off', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // Test highlight 2 should NOT be visible because it has no comment and default is true
        expect(screen.queryByText(/Test highlight 2/)).not.toBeInTheDocument();

        // Toggle Notes Only to false
        const toggleInput = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(toggleInput);

        await waitFor(() => {
            // Now the empty highlight should be visible
            expect(screen.getByText(/Test highlight 2/)).toBeInTheDocument();
        });
    });

    it('can switch to Bookmarks tab and display bookmarks', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        const bookmarksTab = screen.getByText(/Bookmarks/i);
        fireEvent.click(bookmarksTab);

        await waitFor(() => {
            expect(screen.getByText(/Test Bookmark/)).toBeInTheDocument();
        });
    });

    it('listens to edit-highlight window event and opens edit form', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // Trigger custom event
        act(() => {
            window.dispatchEvent(new CustomEvent('edit-highlight', { detail: { id: 'h1' } }));
        });

        await waitFor(() => {
            const saveBtn = screen.getByRole('button', { name: /Save/i });
            expect(saveBtn).toBeInTheDocument();
        });
    });

    it('listens to highlight-added window event and updates state without fetching', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // Reset fetch tracking to ensure no new fetch calls are made
        (global.fetch as jest.Mock).mockClear();

        const newHighlight = { id: 'h3', pageNumber: 10, content: 'New H3', comment: 'Added comment', createdAt: '2023-01-03T00:00:00Z', color: 'pink' };

        act(() => {
            window.dispatchEvent(new CustomEvent('highlight-added', { detail: newHighlight }));
        });

        await waitFor(() => {
            expect(screen.getByText(/New H3/)).toBeInTheDocument();
        });

        // It successfully bypassed repeating the HTTP fetch
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('can save a comment on a highlight', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // Click Edit Note icon to open textarea
        const editNoteBtns = screen.getAllByRole('button', { name: /Edit note/i });
        fireEvent.click(editNoteBtns[0]);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
        });

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Updated comment text' } });

        // Change fetch to return successful patch response
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ comment: 'Updated comment text' }),
        }) as jest.Mock;

        const saveBtn = screen.getByRole('button', { name: /Save/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/highlights/h1', expect.objectContaining({
                method: 'PATCH',
                body: JSON.stringify({ comment: 'Updated comment text' }),
            }));
            // The editor should hide after sync 
            expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
            // The new text should be present
            expect(screen.getByText(/Updated comment text/)).toBeInTheDocument();
        });
    });

    it('can delete a highlight', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        await waitFor(() => {
            expect(screen.getByText(/Test highlight 1/)).toBeInTheDocument();
        });

        // The trash button uses a title "Delete Highlight"
        const deleteHighlightBtns = screen.getAllByRole('button', { name: /Delete Highlight/i });
        fireEvent.click(deleteHighlightBtns[0]);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/highlights/h1', expect.objectContaining({ method: 'DELETE' }));
        });
    });

    it('can delete a bookmark', async () => {
        render(<NoteSidebar bookId="123" currentPage={1} />);

        const bookmarksTab = screen.getByText(/Bookmarks/i);
        fireEvent.click(bookmarksTab);

        await waitFor(() => {
            expect(screen.getByText(/Test Bookmark/)).toBeInTheDocument();
        });

        const deleteBookmarkBtns = screen.getAllByRole('button', { name: /Delete Bookmark/i });
        fireEvent.click(deleteBookmarkBtns[0]);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/bookmarks/b1', expect.objectContaining({ method: 'DELETE' }));
        });
    });
});
