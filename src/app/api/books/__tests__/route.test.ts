import { GET } from '../route';
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
            findMany: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('GET /api/books', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 Unauthorized if no session exists', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const res = await GET();

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('fetches books belonging to the active user', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user-1' } });

        const mockBooks = [
            { id: 'b1', title: 'Book 1', userId: 'user-1' },
            { id: 'b2', title: 'Book 2', userId: 'user-1' },
        ];
        (prisma.book.findMany as jest.Mock).mockResolvedValueOnce(mockBooks);

        const res = await GET();
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toEqual(mockBooks);

        expect(prisma.book.findMany).toHaveBeenCalledWith({
            where: { userId: 'user-1' },
            orderBy: { uploadedAt: "desc" },
        });
    });

    it('returns 500 when database fetching fails', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user-1' } });
        (prisma.book.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));

        const res = await GET();
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toBe('Failed to fetch books');
    });
});
