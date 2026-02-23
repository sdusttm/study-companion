import { NextRequest } from 'next/server';
import { DELETE, PATCH } from '../route';
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
        highlight: {
            findUnique: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

const prisma = new PrismaClient();

describe('/api/highlights/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body?: any) => {
        return {
            json: jest.fn().mockResolvedValue(body || {}),
        } as unknown as NextRequest;
    };

    describe('DELETE', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(401);
            const data = await res.json();
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 404 Not Found if highlight does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.highlight.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Highlight not found or unauthorized');
        });

        it('returns 200 and deletes the highlight on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockHighlight = { id: 'h1', content: 'test', userId: 'u1' };
            (prisma.highlight.findUnique as jest.Mock).mockResolvedValueOnce(mockHighlight);
            (prisma.highlight.delete as jest.Mock).mockResolvedValueOnce(mockHighlight);

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            expect(prisma.highlight.delete).toHaveBeenCalledWith({ where: { id: 'h1' } });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.highlight.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest();
            const res = await DELETE(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to delete highlight');
        });
    });

    describe('PATCH', () => {
        it('returns 401 Unauthorized if no session exists', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ comment: 'Updated note' });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(401);
        });

        it('returns 404 Not Found if highlight does not exist or belong to user', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.highlight.findUnique as jest.Mock).mockResolvedValueOnce(null);

            const req = createMockRequest({ comment: 'Updated note' });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(404);
            const data = await res.json();
            expect(data.error).toBe('Highlight not found or unauthorized');
        });

        it('returns 200 and updates the highlight comment on success', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

            const mockHighlight = { id: 'h1', content: 'test', userId: 'u1', comment: '' };
            (prisma.highlight.findUnique as jest.Mock).mockResolvedValueOnce(mockHighlight);

            const updatedHighlight = { ...mockHighlight, comment: 'Updated note' };
            (prisma.highlight.update as jest.Mock).mockResolvedValueOnce(updatedHighlight);

            const req = createMockRequest({ comment: 'Updated note' });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual(updatedHighlight);

            expect(prisma.highlight.update).toHaveBeenCalledWith({
                where: { id: 'h1' },
                data: { comment: 'Updated note' }
            });
        });

        it('returns 500 on db error', async () => {
            (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
            (prisma.highlight.findUnique as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

            const req = createMockRequest({ comment: 'Updated note' });
            const res = await PATCH(req, { params: Promise.resolve({ id: 'h1' }) });

            expect(res.status).toBe(500);
            const data = await res.json();
            expect(data.error).toBe('Failed to update highlight');
        });
    });
});
