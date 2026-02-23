import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClientReaderLayout } from '../ClientReaderLayout';
import { useSearchParams } from 'next/navigation';

// Mock Next router
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(),
}));

// Mock dynamic import completely to render a dummy Viewer
jest.mock('next/dynamic', () => () => {
    const MockPDFViewer = (props: any) => (
        <div data-testid="mock-pdf-viewer">
            Mock PDF Viewer - Current Page: {props.currentPage}
        </div>
    );
    return MockPDFViewer;
});

// Mock NoteSidebar to avoid deeply rendering its complex logic
jest.mock('../NoteSidebar', () => ({
    NoteSidebar: (props: any) => (
        <div data-testid="mock-note-sidebar">
            Mock Sidebar - Current Page: {props.currentPage}
        </div>
    ),
}));

describe('ClientReaderLayout component', () => {
    let mockSearchParams: { get: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();

        mockSearchParams = { get: jest.fn() };
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    });

    it('initializes with page 1 if no param and no book lastPage', () => {
        mockSearchParams.get.mockReturnValue(null);
        render(<ClientReaderLayout book={{ id: '1', filePath: 'fake.pdf' }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 1');
        expect(screen.getByTestId('mock-note-sidebar')).toHaveTextContent('Current Page: 1');
    });

    it('initializes with book lastPage if present', () => {
        mockSearchParams.get.mockReturnValue(null);
        render(<ClientReaderLayout book={{ id: '1', filePath: 'fake.pdf', lastPage: 205 }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 205');
    });

    it('prioritizes URL searchParam over book lastPage', () => {
        mockSearchParams.get.mockReturnValue('42');
        render(<ClientReaderLayout book={{ id: '1', filePath: 'fake.pdf', lastPage: 205 }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 42');
    });

    it('updates current page when search params change dynamically', () => {
        mockSearchParams.get.mockReturnValue('15');
        const { rerender } = render(<ClientReaderLayout book={{ id: '1', filePath: 'fake.pdf', lastPage: 10 }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 15');

        // Simulate a URL change forcing the component to re-render with a new param
        mockSearchParams.get.mockReturnValue('99');
        rerender(<ClientReaderLayout book={{ id: '1', filePath: 'fake.pdf', lastPage: 10 }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 99');
    });

    it('updates current page when book ID changes', () => {
        mockSearchParams.get.mockReturnValue(null);
        const { rerender } = render(<ClientReaderLayout book={{ id: 'book-A', filePath: 'fake.pdf', lastPage: 10 }} />);
        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 10');

        // Render with a completely new book object
        rerender(<ClientReaderLayout book={{ id: 'book-B', filePath: 'fake.pdf', lastPage: 55 }} />);

        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 55');
    });

    it('does not re-sync if the same book is passed but lastPage prop differs', () => {
        // This validates our specific fix for the scrolling "rubber-banding" issue 
        // We ensure page state isn't reset if book.id is still the same, avoiding active layout fighting
        mockSearchParams.get.mockReturnValue(null);
        const { rerender } = render(<ClientReaderLayout book={{ id: 'book-A', filePath: 'fake.pdf', lastPage: 10 }} />);
        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 10');

        rerender(<ClientReaderLayout book={{ id: 'book-A', filePath: 'fake.pdf', lastPage: 999 }} />);

        // It should REMAIN at page 10, because the book ID didn't change
        expect(screen.getByTestId('mock-pdf-viewer')).toHaveTextContent('Current Page: 10');
    });
});
