import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchClient } from '@/app/search/SearchClient'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn() as jest.Mock

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode, href: string }) => {
        return <a href={href}>{children}</a>
    }
})

describe('SearchClient Components', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear()
    })

    it('renders the search input', () => {
        render(<SearchClient />)
        const input = screen.getByPlaceholderText(/Search through all your highlights and notes/i)
        expect(input).toBeInTheDocument()
    })

    it('does not fetch on initial render or empty query', () => {
        render(<SearchClient />)
        expect(global.fetch).not.toHaveBeenCalled()
    })

    it('fetches search results after debounced typing', async () => {
        // Setup mock response
        const mockNotes = [
            { id: '1', content: 'hello world', pageNumber: 5, book: { title: 'Test Book' } }
        ]
            ; (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => mockNotes,
            })

        render(<SearchClient />)
        const input = screen.getByPlaceholderText(/Search through all your highlights and notes/i)

        fireEvent.change(input, { target: { value: 'hello' } })

        // Wait for the debounce to trigger the fetch
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1)
        }, { timeout: 1000 })

        // Check if the mock note is rendered
        await waitFor(() => {
            expect(screen.getByText(/"hello world"/i)).toBeInTheDocument()
            expect(screen.getByText('Test Book')).toBeInTheDocument()
            expect(screen.getByText('Page 5')).toBeInTheDocument()
        })
    })

    it('displays no results message when empty array is returned', async () => {
        ; (global.fetch as jest.Mock).mockResolvedValueOnce({
            json: async () => [],
        })

        render(<SearchClient />)
        const input = screen.getByPlaceholderText(/Search through all your highlights and notes/i)

        fireEvent.change(input, { target: { value: 'nomatch' } })

        await waitFor(() => {
            expect(screen.getByText(/No results found for "nomatch"/i)).toBeInTheDocument()
        }, { timeout: 1000 })
    })
})
