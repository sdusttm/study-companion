import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UploadBook } from '../UploadBook';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { sha256 } from 'js-sha256';

// Mock Dependencies
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

jest.mock('js-sha256', () => ({
    sha256: jest.fn(),
}));

// Mock global alert
const mockAlert = jest.fn();
global.alert = mockAlert;

describe('UploadBook component', () => {
    let mockRouterPush: jest.Mock;
    let mockRouterRefresh: jest.Mock;
    let mockSupabaseUpload: jest.Mock;
    let mockSupabaseGetPublicUrl: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRouterPush = jest.fn();
        mockRouterRefresh = jest.fn();
        (useRouter as jest.Mock).mockReturnValue({
            push: mockRouterPush,
            refresh: mockRouterRefresh,
        });

        // Mock sha256
        (sha256 as unknown as jest.Mock).mockReturnValue('fake-hash-123');

        // Mock Supabase chained methods
        mockSupabaseUpload = jest.fn().mockResolvedValue({ data: {}, error: null });
        mockSupabaseGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'http://fakeurl.com/pdf' } });

        (createClient as jest.Mock).mockReturnValue({
            storage: {
                from: jest.fn().mockReturnValue({
                    upload: mockSupabaseUpload,
                    getPublicUrl: mockSupabaseGetPublicUrl,
                }),
            },
        });

        // Mock global fetch for our self-hosted backend
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ book: { id: 'book-123' } }),
        }) as jest.Mock;
    });

    it('renders the upload button', () => {
        render(<UploadBook env={{ supabaseUrl: 'mock-url', supabaseAnonKey: 'mock-key' }} />);
        expect(screen.getByRole('button', { name: /Upload Book/i })).toBeInTheDocument();
    });

    it('alerts if the uploaded file is not a PDF', async () => {
        render(<UploadBook env={{ supabaseUrl: 'mock-url', supabaseAnonKey: 'mock-key' }} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['content'], 'test.txt', { type: 'text/plain' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(mockAlert).toHaveBeenCalledWith('Please upload a valid PDF file.');
    });

    it('successfully uploads a new PDF and redirects', async () => {
        render(<UploadBook env={{ supabaseUrl: 'mock-url', supabaseAnonKey: 'mock-key' }} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy content'], 'new-book.pdf', { type: 'application/pdf' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        // Because the mock fetch resolves instantly, we skip asserting 'Uploading Document...'
        // Check Supabase was called instead

        // Check Supabase was called
        await waitFor(() => {
            expect(mockSupabaseUpload).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({
                method: 'POST',
            }));
        });

        // Check UI flips to 'Upload Complete!'
        await waitFor(() => {
            expect(screen.getByText('Upload Complete!')).toBeInTheDocument();
        });

        // Check router redirection triggered (setTimeout 1.2s logic)
        // We will advance timers by replacing setTimeout natively here, or wait just enough if we don't mock timers
        // For simplicity, we can just allow the waitFor to poll until setTimeout triggers
        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith('/reader/book-123');
            expect(mockRouterRefresh).toHaveBeenCalled();
        }, { timeout: 2000 });
    });

    it('shows duplicate modal when file name matches an existing book', async () => {
        const existingBooks = [{ id: 'dup-id', title: 'duplicate-book', fileHash: null }];

        render(<UploadBook env={{ supabaseUrl: 'mock-url', supabaseAnonKey: 'mock-key' }} existingBooks={existingBooks} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy'], 'duplicate-book.pdf', { type: 'application/pdf' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('Existing Book Found')).toBeInTheDocument();
            expect(screen.getByText(/You already have a book named "duplicate-book"/)).toBeInTheDocument();
        });

        // Click Upload Anyway
        const uploadAnywayBtn = screen.getByRole('button', { name: /Upload Anyway/i });
        fireEvent.click(uploadAnywayBtn);

        await waitFor(() => {
            expect(screen.getByText('Upload Complete!')).toBeInTheDocument();
            expect(mockSupabaseUpload).toHaveBeenCalled();
        });
    });

    it('shows exact duplicate modal and redirects to existing book on click', async () => {
        const existingBooks = [{ id: 'exact-dup-id', title: 'duplicate-book', fileHash: 'fake-hash-123' }];

        render(<UploadBook env={{ supabaseUrl: 'mock-url', supabaseAnonKey: 'mock-key' }} existingBooks={existingBooks} />);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['dummy'], 'duplicate-book.pdf', { type: 'application/pdf' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('Existing Book Found')).toBeInTheDocument();
            expect(screen.getByText(/This exact PDF has already been uploaded as "duplicate-book"/)).toBeInTheDocument();
        });

        // Click Open Existing
        const openExistingBtn = screen.getByRole('button', { name: /Open Existing Book/i });
        fireEvent.click(openExistingBtn);

        await waitFor(() => {
            expect(mockRouterPush).toHaveBeenCalledWith('/reader/exact-dup-id');
        });
    });
});
