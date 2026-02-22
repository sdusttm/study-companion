import React from 'react';
import { render, screen } from '@testing-library/react';
import Login from '@/app/login/page';

jest.mock('next/navigation', () => ({
    useRouter() {
        return { push: jest.fn() };
    },
    useSearchParams() {
        return { get: jest.fn() };
    }
}));

jest.mock('next-auth/react', () => ({
    signIn: jest.fn()
}));

describe('Login Page', () => {
    it('renders login form and providers', () => {
        render(<Login />);
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });
});
