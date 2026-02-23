import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

// Mock Next.js globals
jest.mock('next/server', () => ({
    NextRequest: class { },
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
            create: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mockPrisma),
    };
});

// Access mocked prisma instance directly for assertions
const prisma = new PrismaClient();

describe('POST /api/upload', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body: any) => {
        return {
            json: jest.fn().mockResolvedValue(body),
        } as unknown as NextRequest;
    };

    it('returns 401 Unauthorized if no session exists', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null);

        const req = createMockRequest({ title: 'Test Book' });
        const res = await POST(req);

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 Bad Request if required fields are missing', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

        const req = createMockRequest({ title: 'Test Book' }); // Missing fileName, filePath
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Missing required fields');
    });

    it('successfully creates a book record and returns 200', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });

        const mockBookResponse = { id: 'b1', title: 'Test Book', fileName: 'test.pdf' };
        (prisma.book.create as jest.Mock).mockResolvedValueOnce(mockBookResponse);

        const req = createMockRequest({
            title: 'Test Book',
            fileName: 'test.pdf',
            filePath: '/uploads/test.pdf',
            fileHash: 'abcdef123',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.book).toEqual(mockBookResponse);

        expect(prisma.book.create).toHaveBeenCalledWith({
            data: {
                title: 'Test Book',
                fileName: 'test.pdf',
                filePath: '/uploads/test.pdf',
                fileHash: 'abcdef123',
                user: {
                    connect: { id: 'u1' },
                },
            },
        });
    });

    it('returns 500 when database throws an error', async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'u1' } });
        (prisma.book.create as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));

        const req = createMockRequest({
            title: 'Test Book',
            fileName: 'test.pdf',
            filePath: '/uploads/test.pdf',
            fileHash: 'abcdef123',
        });

        const res = await POST(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toBe('DB connection failed');
    });
});
