"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

export function SearchClient() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const urlParams = new URLSearchParams({ q: debouncedQuery });

        fetch(`/api/highlights/search?${urlParams.toString()}`)
            .then(res => res.json())
            .then(data => {
                setResults(Array.isArray(data) ? data : []);
            })
            .catch(err => console.error("Search error", err))
            .finally(() => setIsSearching(false));
    }, [debouncedQuery]);

    return (
        <div className="container animate-fade-in" style={{ padding: '2rem', maxWidth: '800px' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Search Highlights & Notes</h1>
                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                    <SearchIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                    <input
                        className="input glass"
                        type="text"
                        placeholder="Search through all your highlights and notes..."
                        style={{ paddingLeft: '3rem', fontSize: '1.25rem', padding: '1rem 1rem 1rem 3rem', borderRadius: '999px', boxShadow: 'var(--shadow-lg)' }}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isSearching ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                        <Loader2 className="spinning" size={32} />
                    </div>
                ) : debouncedQuery && results.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted-foreground)' }}>
                        <SearchIcon size={48} style={{ margin: '0 auto', opacity: 0.5, marginBottom: '1rem' }} />
                        <p>No results found for "{debouncedQuery}"</p>
                    </div>
                ) : (
                    results.map(highlight => (
                        <Link href={`/reader/${highlight.bookId}?page=${highlight.pageNumber}`} key={highlight.id}>
                            <div className="card hoverable" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        <BookOpen size={16} />
                                        {highlight.book?.title || 'Unknown Book'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.875rem', background: 'var(--muted)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                            Page {highlight.pageNumber}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <p style={{
                                        margin: 0,
                                        paddingLeft: '0.8rem',
                                        borderLeft: '3px solid var(--primary)',
                                        color: 'var(--muted-foreground)',
                                        fontStyle: 'italic',
                                        fontSize: '0.95rem'
                                    }}>
                                        "{highlight.content}"
                                    </p>
                                    {highlight.comment && (
                                        <p style={{ margin: 0, marginTop: '0.25rem', fontWeight: 500 }}>
                                            {highlight.comment}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
