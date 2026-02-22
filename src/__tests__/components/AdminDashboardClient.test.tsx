import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDashboardClient } from '@/app/admin/AdminDashboardClient'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn() as jest.Mock

describe('AdminDashboardClient Component', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear()
    })

    const mockOverviewData = {
        metrics: { totalUsers: 10, totalBooks: 5, totalNotes: 20, totalBookmarks: 15, totalSessions: 50 },
        recentUsers: [
            { id: '1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' }
        ],
        recentBooks: [
            { id: '1', title: 'Test Book', uploadedAt: new Date().toISOString(), user: { email: 'user@test.com' } }
        ]
    }

    it('renders the overview tab by default and fetches metrics', async () => {
        ; (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockOverviewData,
        })

        render(<AdminDashboardClient />)

        // We expect a loader to be present initially
        expect(global.fetch).toHaveBeenCalledWith('/api/admin/metrics')

        // Wait until the data arrives (which implicitly means loading finished)
        const usersLabel = await screen.findByText('Total Users')
        expect(usersLabel).toBeInTheDocument()

        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('Admin')).toBeInTheDocument() // Recent users table
    })

    it('switches to notes tab and fetches global notes', async () => {
        // Setup initial fetch for overview
        ; (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockOverviewData,
        })

        render(<AdminDashboardClient />)

        // Wait for the overview fetch to finish to unblock the UI
        await waitFor(() => {
            expect(screen.getByText('All Notes Explorer')).toBeInTheDocument()
        })

        // Click the notes tab
        const notesTab = screen.getByText('All Notes Explorer')

            // Mock the notes fetch before clicking
            ; (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { id: '1', content: 'Global note content', pageNumber: 1, user: { email: 'test@abc.com' }, book: { title: 'A Book' }, createdAt: new Date().toISOString() }
                ],
            })

        fireEvent.click(notesTab)

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/admin/notes?')
        })

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Global Search through ALL users/i)).toBeInTheDocument()
            expect(screen.getByText('Global note content')).toBeInTheDocument()
        })
    })
})
