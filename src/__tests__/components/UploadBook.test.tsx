import React from 'react';
import { render, screen } from '@testing-library/react';
import { UploadBook } from '@/components/UploadBook';

// Mock Next router
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            refresh: jest.fn()
        };
    },
}));

describe('UploadBook Component', () => {
    it('renders the upload button', () => {
        render(<UploadBook />);
        expect(screen.getByText('Upload Book')).toBeInTheDocument();
    });
});
