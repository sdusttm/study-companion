/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/books/[id]/bookmarks/route';
import { prismaMock } from '../../../../../../prisma/singleton';
import { getServerSession } from '@/lib/auth';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}));

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../../../../prisma/singleton').prismaMock),
}));

describe('/api/books/[id]/bookmarks Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 401 when unauthenticated', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const request = new NextRequest('http://localhost:3000/api/books/b1/bookmarks');
            const response = await GET(request, { params: Promise.resolve({ id: 'b1' }) });

            expect(response.status).toBe(401);
        });

        it('returns 200 with list of bookmarks', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            prismaMock.book.findUnique.mockResolvedValueOnce({ id: 'b1', userId: 'u1' } as any);

            const mockBookmarks = [{ id: 'bm1', pageNumber: 5, title: 'Page 5' }];
            prismaMock.bookmark.findMany.mockResolvedValueOnce(mockBookmarks as any);

            const request = new NextRequest('http://localhost:3000/api/books/b1/bookmarks');
            const response = await GET(request, { params: Promise.resolve({ id: 'b1' }) });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.bookmarks).toHaveLength(1);
            expect(json.bookmarks[0].pageNumber).toBe(5);
        });
    });

    describe('POST', () => {
        it('returns 400 for invalid request body', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const request = new NextRequest('http://localhost:3000/api/books/b1/bookmarks', {
                method: 'POST',
                body: JSON.stringify({ pageNumber: -1 })
            });
            const response = await POST(request, { params: Promise.resolve({ id: 'b1' }) });

            expect(response.status).toBe(400);
        });

        it('creates bookmark successfully', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            prismaMock.book.findUnique.mockResolvedValueOnce({ id: 'b1', userId: 'u1' } as any);
            prismaMock.bookmark.create.mockResolvedValueOnce({ id: 'bm1', pageNumber: 5, title: 'Custom' } as any);

            const request = new NextRequest('http://localhost:3000/api/books/b1/bookmarks', {
                method: 'POST',
                body: JSON.stringify({ pageNumber: 5, title: 'Custom' })
            });
            const response = await POST(request, { params: Promise.resolve({ id: 'b1' }) });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.bookmark.title).toBe('Custom');
            expect(prismaMock.bookmark.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    pageNumber: 5,
                    title: 'Custom'
                })
            }));
        });
    });
});
