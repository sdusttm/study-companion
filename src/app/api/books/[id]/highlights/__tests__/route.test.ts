import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getServerSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Mock Next.js globals
jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({
            status: init?.status || (init ? init.status : 200),
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
        highlight: {
            findMany: jest.fn(),
            create: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('/api/books/[id]/highlights', () => {
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

        it('returns 200 and fetches highlights on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockHighlights = [{ id: 'h1', content: 'Test highlight', pageNumber: 5 }];
            (prisma.highlight.findMany as jest.Mock).mockResolvedValueOnce(mockHighlights);

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual(mockHighlights);

            expect(prisma.highlight.findMany).toHaveBeenCalledWith({
                where: { bookId: 'b1', userId: 'u1' },
                orderBy: { pageNumber: 'asc' },
            });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.highlight.findMany as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest();
            const res = await GET(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to fetch highlights');
        });
    });

    describe('POST', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ content: 'test', position: [], pageNumber: 1 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(401);
        });

        it('returns 400 Bad Request if missing required fields', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            // Missing position and content
            const req = createMockRequest({ pageNumber: 1 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe('Missing required fields');
        });

        it('returns 404 Not Found if book does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ content: 'test', position: [{ top: 10 }], pageNumber: 1 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Book not found or unauthorized');
        });

        it('returns 201 and creates the highlight on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockBook = { id: 'b1', title: 'Test', userId: 'u1' };
            (prisma.book.findUnique as jest.Mock).mockResolvedValueOnce(mockBook);

            const mockHighlight = { id: 'h1', content: 'test', position: [{ top: 10 }], pageNumber: 1, color: 'blue', comment: 'Cool' };
            (prisma.highlight.create as jest.Mock).mockResolvedValueOnce(mockHighlight);

            const req = createMockRequest({ content: 'test', position: [{ top: 10 }], pageNumber: 1, color: 'blue', comment: 'Cool' });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data).toEqual(mockHighlight);

            expect(prisma.highlight.create).toHaveBeenCalledWith({
                data: {
                    bookId: 'b1',
                    userId: 'u1',
                    content: 'test',
                    color: 'blue',
                    position: [{ top: 10 }],
                    comment: 'Cool',
                    pageNumber: 1,
                }
            });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.book.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest({ content: 'test', position: [{ top: 10 }], pageNumber: 1 });
            const res = await POST(req, { params: Promise.resolve({ id: 'b1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to create highlight');
        });
    });
});
