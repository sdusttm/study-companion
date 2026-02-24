/**
 * @jest-environment node
 */
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
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

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {}
}));

jest.mock('@/lib/activity', () => ({
    logActivity: jest.fn(),
}));

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        folder: {
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

describe('DELETE /api/folder/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = () => {
        return {} as unknown as NextRequest;
    };

    it('returns 401 if unauthorized', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest();
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 404 if folder not found or does not belong to user', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user1' }
        });
        (prisma.folder.findUnique as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest();
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.error).toBe('Folder not found');
    });

    it('deletes folder successfully if found and belongs to user', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user1' }
        });

        (prisma.folder.findUnique as jest.Mock).mockResolvedValue({
            id: '1',
            userId: 'user1',
            name: 'Test Folder',
        } as any);

        (prisma.folder.delete as jest.Mock).mockResolvedValue({} as any);

        const req = createMockRequest();
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(prisma.folder.delete).toHaveBeenCalledWith({
            where: { id: '1' }
        });
    });

    it('returns 500 on internal server error', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({
            user: { id: 'user1' }
        });
        (prisma.folder.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const req = createMockRequest();
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toBe('Failed to delete folder');
    });
});

describe('PATCH /api/folder/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createMockRequest = (body: any) => {
        return {
            json: jest.fn().mockResolvedValue(body)
        } as unknown as NextRequest;
    };

    it('returns 401 if unauthorized', async () => {
        (getServerSession as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest({ name: 'New Name' });
        // The PATCH implementation from the implementation imports PATCH correctly, wait we need to import it
        // We will just do a dynamic import or assume it's imported at the top
        const { PATCH } = require('../route');
        const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 if name is invalid', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } });
        const req = createMockRequest({ name: '   ' }); // Empty string
        const { PATCH } = require('../route');

        const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Valid folder name is required');
    });

    it('returns 404 if folder not found or does not belong to user', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } });
        (prisma.folder.findUnique as jest.Mock).mockResolvedValue(null);

        const req = createMockRequest({ name: 'New Name' });
        const { PATCH } = require('../route');

        const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.error).toBe('Folder not found');
    });

    it('renames folder successfully if found and belongs to user', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } });
        (prisma.folder.findUnique as jest.Mock).mockResolvedValue({
            id: '1',
            userId: 'user1',
            name: 'Old Folder Name'
        });
        (prisma.folder.update as jest.Mock).mockResolvedValue({
            id: '1',
            name: 'New Folder Name'
        });

        const req = createMockRequest({ name: 'New Folder Name' });
        const { PATCH } = require('../route');
        const { logActivity } = require('@/lib/activity');

        const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.name).toBe('New Folder Name');
        expect(prisma.folder.update).toHaveBeenCalledWith({
            where: { id: '1' },
            data: { name: 'New Folder Name' }
        });
        expect(logActivity).toHaveBeenCalledWith(
            expect.anything(),
            'RENAME_FOLDER',
            'Old Folder Name -> New Folder Name'
        );
    });

    it('returns 500 on internal server error', async () => {
        (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user1' } });
        (prisma.folder.findUnique as jest.Mock).mockRejectedValue(new Error('DB Error'));

        const req = createMockRequest({ name: 'New Name' });
        const { PATCH } = require('../route');

        const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toBe('Failed to rename folder');
    });
});
