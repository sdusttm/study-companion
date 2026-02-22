/**
 * @jest-environment node
 */
import { GET } from '@/app/api/books/[id]/route';
import { prismaMock } from '../../../../../prisma/singleton';
import { getServerSession } from '@/lib/auth';
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}));

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../../../prisma/singleton').prismaMock),
}));

describe('/api/books/[id] GET Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if unauthenticated', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const request = new NextRequest('http://localhost:3000/api/books/b1');
        const response = await GET(request, { params: Promise.resolve({ id: 'b1' }) });

        expect(response.status).toBe(401);
    });

    it('returns 404 if book not found', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user_1' } });
        prismaMock.book.findUnique.mockResolvedValueOnce(null);

        const request = new NextRequest('http://localhost:3000/api/books/b1');
        const response = await GET(request, { params: Promise.resolve({ id: 'b1' }) });

        expect(response.status).toBe(404);
    });

    it('returns 200 with book data', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user_1' } });
        const mockBook = { id: 'b1', title: 'Test', userId: 'user_1' };
        prismaMock.book.findUnique.mockResolvedValueOnce(mockBook as any);

        const request = new NextRequest('http://localhost:3000/api/books/b1');
        const response = await GET(request, { params: Promise.resolve({ id: 'b1' }) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.title).toBe('Test');
    });
});
