import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LibraryGrid } from '../LibraryGrid';
import { LibraryItem } from '../LibraryGrid';
import { useRouter } from 'next/navigation';

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
    ...jest.requireActual('@dnd-kit/core'),
    DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
    useSensor: jest.fn(),
    useSensors: jest.fn(),
    PointerSensor: jest.fn(),
    KeyboardSensor: jest.fn(),
}));

describe('LibraryGrid Thumbnail Rendering', () => {
    const mockItems: LibraryItem[] = [
        {
            id: 'book-with-thumb',
            type: 'book',
            title: 'Book with Thumbnail',
            order: 0,
            uploadedAt: new Date(),
            thumbnailUrl: 'http://example.com/thumb.jpg'
        },
        {
            id: 'book-without-thumb',
            type: 'book',
            title: 'Book without Thumbnail',
            order: 1,
            uploadedAt: new Date(),
            thumbnailUrl: null
        },
    ];

    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue({
            refresh: jest.fn(),
            push: jest.fn()
        });
    });

    it('renders img tag when thumbnailUrl is provided', () => {
        render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        const img = screen.getByTestId('thumbnail-img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'http://example.com/thumb.jpg');
    });

    it('renders fallback icon when thumbnailUrl is missing', () => {
        render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        // Find the card content for the book without thumbnail
        const cards = screen.getAllByRole('heading', { level: 3 });
        const cardWithoutThumb = cards.find(c => c.textContent === 'Book without Thumbnail')?.closest('div')?.parentElement;

        // It should NOT have a thumbnail img
        expect(cardWithoutThumb?.querySelector('[data-testid="thumbnail-img"]')).not.toBeInTheDocument();

        // It should have an SVG icon
        expect(cardWithoutThumb?.querySelector('svg')).toBeInTheDocument();
    });

    it('applies book-like styling (aspect-ratio 3/4)', () => {
        render(<LibraryGrid initialItems={mockItems} currentFolderId={undefined} />);

        const containers = screen.getAllByTestId('book-container');
        expect(containers[0]).toHaveStyle({
            aspectRatio: '3 / 4'
        });
    });
});
