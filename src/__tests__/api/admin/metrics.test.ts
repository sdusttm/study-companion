/**
 * @jest-environment node
 */
import { GET } from '@/app/api/admin/metrics/route'
import { prismaMock } from '../../../../prisma/singleton'
import { getServerSession } from '@/lib/auth'

jest.mock('@/lib/auth', () => ({
    getServerSession: jest.fn(),
    authOptions: {},
}))

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => require('../../../../prisma/singleton').prismaMock),
}))

describe('/api/admin/metrics GET Route', () => {
    const mockAdminSession = {
        user: { id: 'admin_1', email: 'admin@example.com', role: 'ADMIN' }
    }
    const mockUserSession = {
        user: { id: 'user_1', email: 'user@example.com', role: 'USER' }
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('returns 401 when unauthenticated', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(null)
        const response = await GET()
        expect(response.status).toBe(401)
    })

    it('returns 401 when user is not an admin', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(mockUserSession)
        const response = await GET()
        expect(response.status).toBe(401)
    })

    it('returns metrics and recent data when admin', async () => {
        ; (getServerSession as jest.Mock).mockResolvedValueOnce(mockAdminSession)

        // Mock Prisma count aggregations
        prismaMock.user.count.mockResolvedValueOnce(10)
        prismaMock.book.count.mockResolvedValueOnce(5)
        prismaMock.note.count.mockResolvedValueOnce(20)
        prismaMock.bookmark.count.mockResolvedValueOnce(15)
        prismaMock.session.count.mockResolvedValueOnce(2)

        // Mock Prisma findMany for recent data
        prismaMock.user.findMany.mockResolvedValueOnce([{ id: 'u1', name: 'User 1' }] as any)
        prismaMock.book.findMany.mockResolvedValueOnce([{ id: 'b1', title: 'Book 1' }] as any)

        const response = await GET()
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.metrics.totalUsers).toBe(10)
        expect(json.metrics.totalBooks).toBe(5)
        expect(json.recentUsers.length).toBe(1)
        expect(json.recentBooks.length).toBe(1)

        // Ensure all endpoints are queried with the exact criteria expected by the backend
        expect(prismaMock.user.count).toHaveBeenCalled()
        expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }))
    })
})
