import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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

        await act(async () => {
            render(<NoteSidebar bookId="123" currentPage={1} />)
        })

        await waitFor(() => {
            expect(screen.getByText(/No notes yet\. Select text in the PDF to create one!/i)).toBeInTheDocument()
        })

        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/highlights', expect.objectContaining({ cache: 'no-store' }))
        expect(global.fetch).toHaveBeenCalledWith('/api/books/123/bookmarks', expect.objectContaining({ cache: 'no-store' }))
    })

    it('fetches and displays existing notes', async () => {
        ; (global.fetch as jest.Mock).mockImplementation(async (url) => {
            if (url.includes('/bookmarks')) {
                return { ok: true, json: async () => ({ bookmarks: [] }) }
            }
            return {
                ok: true, json: async () => [
                    { id: '1', content: 'Test highlight content', comment: 'test comment', createdAt: new Date().toISOString(), pageNumber: 1, position: {} }
                ]
            }
        })

        await act(async () => {
            render(<NoteSidebar bookId="123" currentPage={1} />)
        })

        await waitFor(() => {
            expect(screen.getByText(/Test highlight content/i)).toBeInTheDocument()
        })
    })

    it('allows adding a comment to a highlight', async () => {
        // Initial fetches
        ; (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
            if (options?.method === 'PATCH') {
                return { ok: true, json: async () => ({ id: '1', comment: 'My new comment' }) }
            }
            if (url.includes('/bookmarks')) {
                return { ok: true, json: async () => ({ bookmarks: [] }) }
            }
            return {
                ok: true, json: async () => [
                    { id: '1', content: 'Test highlight', comment: 'existing comment', createdAt: new Date().toISOString(), pageNumber: 1, position: {} }
                ]
            } // GET Highlights
        })

        await act(async () => {
            render(<NoteSidebar bookId="123" currentPage={1} />)
        })

        await waitFor(() => {
            expect(screen.getByText(/Test highlight/i)).toBeInTheDocument()
        })

        const editButton = screen.getByRole('button', { name: /Edit/i })
        fireEvent.click(editButton)

        const textarea = screen.getByPlaceholderText(/Add your note\.\.\./i)
        fireEvent.change(textarea, { target: { value: 'My new comment' } })

        const button = screen.getByRole('button', { name: /Save/i })
        fireEvent.click(button)

        // Assert that the fetch PATCH was called
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/highlights/1', expect.objectContaining({
                method: 'PATCH',
                body: expect.stringContaining('My new comment')
            }))
        })

        // Assert that the new comment appears in the UI
        await waitFor(() => {
            expect(screen.getByText('My new comment')).toBeInTheDocument()
        })
    })
})
