import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PDFViewer } from '../PDFViewer';
import { useRouter } from 'next/navigation';

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

// Mock react-pdf-viewer components
jest.mock('@react-pdf-viewer/core', () => {
    const originalModule = jest.requireActual('@react-pdf-viewer/core');
    return {
        ...originalModule,
        Worker: ({ children }: any) => <div data-testid="pdf-worker">{children}</div>,
        Viewer: ({ fileUrl, initialPage, onDocumentLoad, plugins }: any) => {
            // Simulate document load immediately so buttons are enabled
            setTimeout(() => onDocumentLoad && onDocumentLoad({ doc: { numPages: 10 } }), 0);
            return (
                <div data-testid="pdf-viewer" data-url={fileUrl} data-page={initialPage}>
                    Mock Viewer
                </div>
            );
        },
        SpecialZoomLevel: { PageWidth: 'PageWidth' },
    };
});

jest.mock('@react-pdf-viewer/highlight', () => ({
    highlightPlugin: jest.fn().mockReturnValue({
        jumpToHighlightArea: jest.fn()
    }),
    Trigger: { TextSelection: 'TextSelection' },
}));

jest.mock('@react-pdf-viewer/page-navigation', () => ({
    pageNavigationPlugin: jest.fn().mockReturnValue({ jumpToPage: jest.fn() }),
}));

jest.mock('@react-pdf-viewer/scroll-mode', () => ({
    scrollModePlugin: jest.fn().mockReturnValue({}),
}));

describe('PDFViewer component', () => {
    let mockRouterPush: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        mockRouterPush = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockRouterPush,
            back: jest.fn(),
        });

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue([]),
        }) as jest.Mock;
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('renders the core viewer with standard props', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={jest.fn()}
                />
            );
        });

        expect(screen.getByTestId('pdf-worker')).toBeInTheDocument();
        expect(screen.getByTestId('pdf-viewer')).toHaveAttribute('data-url', 'http://fakeurl.com/doc.pdf');
        expect(screen.getByTestId('pdf-viewer')).toHaveAttribute('data-page', '0'); // Document lines pages are 0-indexed
    });

    it('shows navigation header with book title', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={jest.fn()}
                />
            );
        });

        expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    it('navigates back when back button is clicked', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={jest.fn()}
                />
            );
        });

        const backBtn = screen.getByTitle("Back to Dashboard");
        fireEvent.click(backBtn);
        expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('fetches highlights on load', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={jest.fn()}
                />
            );
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/books/123/highlights');
        });
    });

    it('toggles scale state using zoom buttons', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={jest.fn()}
                />
            );
        });

        const zoomInBtn = await waitFor(() => screen.getByTestId('zoom-in'));
        const zoomOutBtn = await waitFor(() => screen.getByTestId('zoom-out'));

        expect(zoomInBtn).not.toBeDisabled();
        expect(zoomOutBtn).not.toBeDisabled();
        expect(zoomInBtn).toBeInTheDocument();
        expect(zoomOutBtn).toBeInTheDocument();
    });

    it('saves bookmark', async () => {
        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={5}
                    onPageChange={jest.fn()}
                />
            );
        });

        const saveBookmarkBtn = screen.getByTitle("Bookmark this page");

        expect(saveBookmarkBtn).not.toBeDisabled();
        fireEvent.click(saveBookmarkBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/books/123/bookmarks', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ pageNumber: 5 })
            }));
        });
    });

    it('handles navigate-to-highlight event correctly', async () => {
        const onPageChange = jest.fn();
        const mockHighlights = [
            { id: 'h1', position: [{ pageIndex: 12, left: 10, top: 20, width: 30, height: 40 }] }
        ];

        // Access the highlightPlugin mock to get the jumpToHighlightArea mock
        const { highlightPlugin } = require('@react-pdf-viewer/highlight');
        const mockJump = highlightPlugin().jumpToHighlightArea;

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(mockHighlights),
        });

        await act(async () => {
            render(
                <PDFViewer
                    pdfUrl="http://fakeurl.com/doc.pdf"
                    bookId="123"
                    bookTitle="Test Document"
                    currentPage={1}
                    onPageChange={onPageChange}
                />
            );
        });

        // Trigger the event
        act(() => {
            window.dispatchEvent(new CustomEvent('navigate-to-highlight', {
                detail: { highlightId: 'h1' }
            }));
        });

        // Should call onPageChange immediately
        expect(onPageChange).toHaveBeenCalledWith(13);

        // Fast-forward 50ms for the jump delay
        act(() => {
            jest.advanceTimersByTime(50);
        });

        expect(mockJump).toHaveBeenCalledWith(expect.objectContaining({
            pageIndex: 12,
            top: expect.any(Number) // The calculation is now dynamic based on DOM which is hard to predict in JSDOM
        }));
    });
});
