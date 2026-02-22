/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/books/[id]/progress/route';
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

describe('/api/books/[id]/progress PATCH Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when unauthenticated', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const request = new NextRequest('http://localhost:3000/api/books/b1/progress', {
            method: 'PATCH',
            body: JSON.stringify({ lastPage: 5 })
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'b1' }) });

        expect(response.status).toBe(401);
    });

    it('returns 400 for invalid page number', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

        const request = new NextRequest('http://localhost:3000/api/books/b1/progress', {
            method: 'PATCH',
            body: JSON.stringify({ lastPage: 0 })
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'b1' }) });

        expect(response.status).toBe(400);
    });

    it('returns 404 if book not found or unauthorized', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
        prismaMock.book.findFirst.mockResolvedValueOnce(null);

        const request = new NextRequest('http://localhost:3000/api/books/b1/progress', {
            method: 'PATCH',
            body: JSON.stringify({ lastPage: 5 })
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'b1' }) });

        expect(response.status).toBe(404);
    });

    it('updates book progress successfully', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
        prismaMock.book.findFirst.mockResolvedValueOnce({ id: 'b1', userId: 'u1' } as any);
        prismaMock.book.update.mockResolvedValueOnce({ id: 'b1', lastPage: 5 } as any);

        const request = new NextRequest('http://localhost:3000/api/books/b1/progress', {
            method: 'PATCH',
            body: JSON.stringify({ lastPage: 5 })
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'b1' }) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(prismaMock.book.update).toHaveBeenCalledWith({
            where: { id: 'b1' },
            data: { lastPage: 5 }
        });
    });
});
