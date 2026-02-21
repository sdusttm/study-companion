"use client";

import { useState, useEffect } from "react";
import { Search as SearchIcon, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce"; // I'll create this hook

export default function SearchPage() {
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
        fetch(`/api/notes/search?q=${encodeURIComponent(debouncedQuery)}`)
            .then(res => res.json())
            .then(data => {
                setResults(data || []);
            })
            .catch(err => console.error("Search error", err))
            .finally(() => setIsSearching(false));
    }, [debouncedQuery]);

    return (
        <div className="container animate-fade-in" style={{ padding: '2rem', maxWidth: '800px' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Search Notes</h1>
                <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
                    <SearchIcon style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                    <input
                        className="input glass"
                        type="text"
                        placeholder="Search through all your notes and highlights..."
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
                        <p>No notes found for "{debouncedQuery}"</p>
                    </div>
                ) : (
                    results.map(note => (
                        <Link href={`/reader/${note.bookId}?page=${note.pageNumber}`} key={note.id}>
                            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        <BookOpen size={16} />
                                        {note.book?.title || 'Unknown Book'}
                                    </div>
                                    <span style={{ fontSize: '0.875rem', background: 'var(--muted)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                        Page {note.pageNumber}
                                    </span>
                                </div>
                                <p style={{ marginTop: '0.5rem' }}>
                                    {/* Highlight the match roughly by making it bold? Simple approach for now: just render */}
                                    {note.content}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
