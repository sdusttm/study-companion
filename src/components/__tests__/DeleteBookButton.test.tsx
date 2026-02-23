import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeleteBookButton } from '../DeleteBookButton';
import { useRouter } from 'next/navigation';
import ReactDOM from 'react-dom';

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock createPortal to just render children directly for easier testing
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (node: React.ReactNode) => node,
}));

// Mock global alert
const mockAlert = jest.fn();
global.alert = mockAlert;

describe('DeleteBookButton component', () => {
    let mockRouterRefresh: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRouterRefresh = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            refresh: mockRouterRefresh,
        });

        // Mock global fetch for DELETE
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ success: true }),
        }) as jest.Mock;
    });

    it('renders the delete button initially', () => {
        render(<DeleteBookButton bookId="123" bookTitle="Test Book" />);
        expect(screen.getByRole('button', { name: /Delete book/i })).toBeInTheDocument();
    });

    it('opens the confirmation modal when clicked', () => {
        render(<DeleteBookButton bookId="123" bookTitle="Test Book" />);

        const deleteBtn = screen.getByRole('button', { name: /Delete book/i });
        fireEvent.click(deleteBtn);

        expect(screen.getByText('Delete Book')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
        expect(screen.getByText(/"Test Book"/)).toBeInTheDocument();
    });

    it('closes the modal when cancel is clicked', () => {
        render(<DeleteBookButton bookId="123" bookTitle="Test Book" />);

        const deleteBtn = screen.getByRole('button', { name: /Delete book/i });
        fireEvent.click(deleteBtn);

        const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByText('Delete Book')).not.toBeInTheDocument();
    });

    it('calls fetch DELETE and refreshes router when confirmed', async () => {
        render(<DeleteBookButton bookId="123" bookTitle="Test Book" />);

        const deleteBtn = screen.getByRole('button', { name: /Delete book/i });
        fireEvent.click(deleteBtn);

        const confirmBtn = screen.getByRole('button', { name: /Delete Permanently/i });
        fireEvent.click(confirmBtn);

        // Verify button changes to deleting state
        expect(screen.getByText('Deleting...')).toBeInTheDocument();

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/books/123', expect.objectContaining({
                method: 'DELETE',
            }));
            expect(mockRouterRefresh).toHaveBeenCalled();
            expect(screen.queryByText('Delete Book')).not.toBeInTheDocument();
        });
    });

    it('handles api errors gracefully and shows an alert', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: jest.fn().mockResolvedValue({ error: 'Failed from backend' }),
        }) as jest.Mock;

        render(<DeleteBookButton bookId="123" bookTitle="Test Book" />);

        const deleteBtn = screen.getByRole('button', { name: /Delete book/i });
        fireEvent.click(deleteBtn);

        const confirmBtn = screen.getByRole('button', { name: /Delete Permanently/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mockAlert).toHaveBeenCalledWith('Failed from backend');
            // Modal should still be open on failure
            expect(screen.getByText('Delete Book')).toBeInTheDocument();
        });
    });
});
