/**
 * @jest-environment node
 */
import { POST } from '@/app/api/upload/route'
import { prismaMock } from '../../../prisma/singleton'
import { getServerSession } from '@/lib/auth'
import { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}))

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../prisma/singleton').prismaMock),
}))

describe('/api/upload POST Route', () => {
    const mockUserSession = {
        user: { id: 'user_1', email: 'test@example.com' }
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 when unauthenticated', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(null)

        const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            body: JSON.stringify({ title: 'T', fileName: 'F.pdf', filePath: '/f.pdf' })
        })
        const response = await POST(request)

        expect(response.status).toBe(401)
    })

    it('returns 400 when missing fields', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(mockUserSession)

        // Missing title
        const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            body: JSON.stringify({ fileName: 'F.pdf', filePath: '/f.pdf' })
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
    })

    it('creates book record and returns 200 on success', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(mockUserSession)

        const mockBook = {
            id: 'book1',
            title: 'My Book',
            fileName: 'test.pdf',
            filePath: 'remote/test.pdf',
            userId: 'user_1',
            lastPage: 1,
            uploadedAt: new Date()
        }

        prismaMock.book.create.mockResolvedValueOnce(mockBook as any)

        const request = new NextRequest('http://localhost:3000/api/upload', {
            method: 'POST',
            body: JSON.stringify({ title: 'My Book', fileName: 'test.pdf', filePath: 'remote/test.pdf' })
        })
        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.book.id).toBe('book1')
        expect(prismaMock.book.create).toHaveBeenCalledWith({
            data: {
                title: 'My Book',
                fileName: 'test.pdf',
                filePath: 'remote/test.pdf',
                user: { connect: { id: 'user_1' } }
            }
        })
    })
})
