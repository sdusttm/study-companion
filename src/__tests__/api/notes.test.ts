/**
 * @jest-environment node
 */
import { POST } from '@/app/api/notes/route'
import { prismaMock } from '../../../prisma/singleton'
import { getServerSession } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Mock next-auth and auth config
jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}))

// Intercept new PrismaClient()
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../prisma/singleton').prismaMock),
}))

describe('/api/notes POST Route', () => {
    const mockUserSession = {
        user: { id: 'user_1', email: 'test@example.com' }
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 when unauthenticated', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(null)

        const request = new NextRequest('http://localhost:3000/api/notes', {
            method: 'POST',
            body: JSON.stringify({ bookId: 'b1', pageNumber: 1, content: 'test' })
        })
        const response = await POST(request)

        expect(response.status).toBe(401)
    })

    it('creates a new note', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(mockUserSession)

        // Auth check fetches the book first
        prismaMock.book.findUnique.mockResolvedValueOnce({ id: 'b1', userId: 'user_1' } as any)

        // Then create note
        const newNote = { id: 'n1', bookId: 'b1', pageNumber: 1, content: 'test string', userId: 'user_1', createdAt: new Date() }
        prismaMock.note.create.mockResolvedValueOnce(newNote as any)

        const request = new NextRequest('http://localhost:3000/api/notes', {
            method: 'POST',
            body: JSON.stringify({ bookId: 'b1', pageNumber: 1, content: 'test string', paragraphContext: '' })
        })

        const response = await POST(request)
        const json = await response.json()

        expect(response.status).toBe(201)
        expect(json.content).toBe('test string')
        expect(prismaMock.note.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'user_1',
                content: 'test string',
                bookId: 'b1'
            })
        })
    })
})
