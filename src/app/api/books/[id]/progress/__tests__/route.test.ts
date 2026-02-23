import { NextRequest } from 'next/server';
import { PATCH } from '../route';
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
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('PATCH /api/books/[id]/progress', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body?: any) => {
        return {
            json: jest.fn().mockResolvedValue(body || {}),
        } as unknown as NextRequest;
    };

    it('returns 401 Unauthorized if no session exists', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({ lastPage: 5 });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 Bad Request if lastPage is invalid', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

        const req = createMockRequest({ lastPage: 0 }); // Invalid page
        const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Invalid page number');
    });

    it('returns 404 Not Found if book does not exist or belong to user', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
        (prisma.book.findFirst as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({ lastPage: 5 });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe('Book not found or unauthorized');
    });

    it('returns 200 and updates the book progress on success', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

        const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
        (prisma.book.findFirst as jest.Mock).mockResolvedValueOnce(mockBook);
        (prisma.book.update as jest.Mock).mockResolvedValueOnce(mockBook);

        const req = createMockRequest({ lastPage: 5 });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);

        expect(prisma.book.update).toHaveBeenCalledWith({
            where: { id: 'b1' },
            data: { lastPage: 5 }
        });
    });

    it('returns 500 on db error', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
        (prisma.book.findFirst as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

        const req = createMockRequest({ lastPage: 5 });
        const res = await PATCH(req, { params: Promise.resolve({ id: 'b1' }) });

        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toBe('Internal Server Error');
    });
});
