import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HighlightPopover } from '../PDFViewer';

describe('HighlightPopover component', () => {
    const mockHighlight = {
        id: 'h1',
        pageNumber: 1,
        content: 'Test highlight content',
        notes: [
            { id: 'n1', content: 'Note 1', createdAt: '2023-01-01' }
        ],
        createdAt: '2023-01-01',
        position: []
    };

    const mockOnClose = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnAddNote = jest.fn();
    const mockOnDeleteNote = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders highlight content and notes', () => {
        render(
            <HighlightPopover
                highlight={mockHighlight}
                onClose={mockOnClose}
                onDelete={mockOnDelete}
                onAddNote={mockOnAddNote}
                onDeleteNote={mockOnDeleteNote}
                containerStyle={{ left: 0, top: 0 }}
            />
        );

        expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    it('implements two-step confirmation for deleting a note', async () => {
        render(
            <HighlightPopover
                highlight={mockHighlight}
                onClose={mockOnClose}
                onDelete={mockOnDelete}
                onAddNote={mockOnAddNote}
                onDeleteNote={mockOnDeleteNote}
                containerStyle={{ left: 0, top: 0 }}
            />
        );

        const deleteNoteBtn = screen.getByTitle('Delete Note');

        // First click
        fireEvent.click(deleteNoteBtn);

        // Verify "Delete?" label appears
        expect(screen.getByText(/Delete\?/i)).toBeInTheDocument();
        expect(mockOnDeleteNote).not.toHaveBeenCalled();

        // Second click
        const confirmBtn = screen.getByTitle('Confirm Delete');
        fireEvent.click(confirmBtn);

        expect(mockOnDeleteNote).toHaveBeenCalledWith('h1', 'n1');
    });

    it('implements two-step confirmation for deleting a highlight', async () => {
        render(
            <HighlightPopover
                highlight={mockHighlight}
                onClose={mockOnClose}
                onDelete={mockOnDelete}
                onAddNote={mockOnAddNote}
                onDeleteNote={mockOnDeleteNote}
                containerStyle={{ left: 0, top: 0 }}
            />
        );

        const deleteHighlightBtn = screen.getByTitle('Delete Highlight');

        // First click
        fireEvent.click(deleteHighlightBtn);

        // Verify "Delete?" label appears
        expect(screen.getByText(/Delete\?/i)).toBeInTheDocument();
        expect(mockOnDelete).not.toHaveBeenCalled();

        // Second click
        const confirmBtn = screen.getByTitle('Confirm Delete');
        fireEvent.click(confirmBtn);

        expect(mockOnDelete).toHaveBeenCalledWith('h1');
    });

    it('resets confirmation state after timeout', async () => {
        render(
            <HighlightPopover
                highlight={mockHighlight}
                onClose={mockOnClose}
                onDelete={mockOnDelete}
                onAddNote={mockOnAddNote}
                onDeleteNote={mockOnDeleteNote}
                containerStyle={{ left: 0, top: 0 }}
            />
        );

        const deleteNoteBtn = screen.getByTitle('Delete Note');
        fireEvent.click(deleteNoteBtn);
        expect(screen.getByText(/Delete\?/i)).toBeInTheDocument();

        // Fast-forward 3 seconds
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(screen.queryByText(/Delete\?/i)).not.toBeInTheDocument();
        });
    });
});
