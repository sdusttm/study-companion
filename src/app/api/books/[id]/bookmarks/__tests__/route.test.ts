import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
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
        },
        bookmark: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('/api/books/[id]/bookmarks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body?: any) => {
        return {
            json: jest.fn().mockResolvedValue(body || {}),
        } as unknown as NextRequest;
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
            expect(data.error).toBe('Book not found or unauthorized');
        });

        it('returns 200 and fetches bookmarks on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(mockBook);

            const mockBookmarks = [{ id: 'bm1', pageNumber: 5, title: 'Page 5' }];
            (prisma.bookmark.findMany as jest.Mock).mockResolvedValueOnce(mockBookmarks);

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.bookmarks).toEqual(mockBookmarks);
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Internal Server Error');
        });
    });

    describe('POST', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ pageNumber: 1 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(401);
        });

        it('returns 400 Bad Request if pageNumber is invalid', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const req = createMockRequest({ pageNumber: 0 }); // Invalid page
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('Invalid page number');
        });

        it('returns 404 Not Found if book does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ pageNumber: 5 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Book not found or unauthorized');
        });

        it('returns 200 and creates the bookmark on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(mockBook);

            const mockBookmark = { id: 'bm1', pageNumber: 5, title: 'Custom Title', bookId: 'b1', userId: 'u1' };
            (prisma.bookmark.create as jest.Mock).mockResolvedValueOnce(mockBookmark);

            const req = createMockRequest({ pageNumber: 5, title: 'Custom Title' });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.bookmark).toEqual(mockBookmark);

            expect(prisma.bookmark.create).toHaveBeenCalledWith({
                data: {
                    bookId: 'b1',
                    pageNumber: 5,
                    title: 'Custom Title',
                    userId: 'u1',
                }
            });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest({ pageNumber: 5 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Internal Server Error');
        });
    });
});
