import React from 'react';
import { render, screen } from '@testing-library/react';
import { PDFViewer } from '@/components/PDFViewer';

jest.mock('next/navigation', () => ({
    useRouter() {
        return { push: jest.fn(), refresh: jest.fn() };
    },
}));

jest.mock('react-pdf', () => ({
    pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
    Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
    Page: () => <div data-testid="pdf-page">Mock Page</div>,
}));

global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true })
})) as jest.Mock;

describe('PDFViewer Component', () => {
    it('renders the viewer with controls', () => {
        render(
            <PDFViewer
                pdfUrl="test.pdf"
                bookId="b1"
                bookTitle="Test Book"
                currentPage={1}
                onPageChange={jest.fn()}
            />
        );
        expect(screen.getByText('Test Book')).toBeInTheDocument();
        expect(screen.getByTestId('pdf-document')).toBeInTheDocument();
    });
});
