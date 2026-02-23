import { NextRequest } from 'next/server';
import { GET, DELETE } from '../route';
import { getServerSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Mock Next.js globals
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}));

// Mock dependencies
jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}));

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        book: {
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('/api/books/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = () => {
        return {} as unknown as NextRequest;
    };

    describe('GET', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 404 Not Found if book does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Book not found');
        });

        it('returns 200 and the book object', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(mockBook);

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual(mockBook);
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to fetch book');
        });
    });

    describe('DELETE', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 404 Not Found if book does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Book not found or unauthorized');
        });

        it('returns 200 and deletes the book on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(mockBook);
            (prisma.book.delete as jest.Mock).mockResolvedValueOnce(mockBook);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            expect(prisma.book.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to delete book');
        });
    });
});
