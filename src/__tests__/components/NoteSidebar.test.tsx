import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NoteSidebar } from '@/components/NoteSidebar'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn() as jest.Mock

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter() {
        return {
            push: jest.fn(),
            replace: jest.fn(),
            prefetch: jest.fn(),
            refresh: jest.fn(),
        };
    },
}))

describe('NoteSidebar Component', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear()
        window.HTMLElement.prototype.scrollIntoView = jest.fn()
    })

    it('renders loading state initially, then empty notes message', async () => {
        ; (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/bookmarks')) {
                return { ok: true, json: async () => ({ bookmarks: [] }) }
            }
            return { ok: true, json: async () => [] } // Notes
        })

        render(<NoteSidebar bookId="123" currentPage={1} />)



        await waitFor(() => {
            expect(screen.getByText(/No notes yet\. Add one below to start!/i)).toBeInTheDocument()
        })

        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/notes')
        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/bookmarks')
    })

    it('fetches and displays existing notes', async () => {
        ; (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/bookmarks')) {
                return { ok: true, json: async () => ({ bookmarks: [] }) }
            }
            return {
                ok: true, json: async () => [
                    { id: '1', content: 'Test note content', createdAt: new Date().toISOString(), pageNumber: 1 }
                ]
            }
        })

        render(<NoteSidebar bookId="123" currentPage={1} />)

        await waitFor(() => {
            expect(screen.getByText('Test note content')).toBeInTheDocument()
        })
    })

    it('allows adding a new note', async () => {
        // Initial fetches (empty)
        ; (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
            if (options?.method === 'POST') {
                return { ok: true, json: async () => ({ id: '2', content: 'My new note', createdAt: new Date().toISOString() }) }
            }
            if (url.includes('/bookmarks')) {
                return { ok: true, json: async () => ({ bookmarks: [] }) }
            }
            return { ok: true, json: async () => [] } // GET Notes
        })

        render(<NoteSidebar bookId="123" currentPage={1} />)

        await waitFor(() => {
            expect(screen.getByText(/No notes yet\. Add one below to start!/i)).toBeInTheDocument()
        })

        const textarea = screen.getByPlaceholderText(/Add a note for Page 1/i)
        fireEvent.change(textarea, { target: { value: 'My new note' } })

        const button = screen.getByRole('button', { name: /Save Note/i })
        fireEvent.click(button)

        // Assert that the fetch POST was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/notes', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('My new note')
            }))
        })

        // Assert that the new note appears in the UI
        await waitFor(() => {
            expect(screen.getByText('My new note')).toBeInTheDocument()
        })
    })
})
