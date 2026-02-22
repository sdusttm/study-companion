import React from 'react';
import { render, screen } from '@testing-library/react';
import Register from '@/app/register/page';

jest.mock('next/navigation', () => ({
    useRouter() {
        return { push: jest.fn() };
    }
}));

jest.mock('next-auth/react', () => ({
    signIn: jest.fn()
}));

describe('Register Page', () => {
    it('renders register form', () => {
        render(<Register />);
        expect(screen.getByText(/Create an account/i)).toBeInTheDocument();
    });
});
