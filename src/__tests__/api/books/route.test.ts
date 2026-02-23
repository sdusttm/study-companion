/**
 * @jest-environment node
 */
import { GET } from '@/app/api/books/route';
import { prismaMock } from '../../../../prisma/singleton';
import { getServerSession } from '@/lib/auth';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}));

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../../prisma/singleton').prismaMock),
}));

describe('/api/books GET Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when unauthenticated', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const request = new NextRequest('http://localhost:3000/api/books');
        const response = await GET();

        expect(response.status).toBe(401);
    });

    it('returns 200 with list of books', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({
            user: { id: 'user_1' }
        });

        const mockBooks = [
            { id: 'b1', title: 'Book 1', fileName: 'b1.pdf', createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', lastPage: 1 },
            { id: 'b2', title: 'Book 2', fileName: 'b2.pdf', createdAt: new Date(), updatedAt: new Date(), userId: 'user_1', lastPage: 5 }
        ];

        prismaMock.book.findMany.mockResolvedValueOnce(mockBooks as any);

        const request = new NextRequest('http://localhost:3000/api/books');
        const response = await GET();
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).toHaveLength(2);
        expect(json[0].title).toBe('Book 1');
        expect(prismaMock.book.findMany).toHaveBeenCalledWith({
            where: { userId: 'user_1' },
            orderBy: { uploadedAt: 'desc' }
        });
    });
});
