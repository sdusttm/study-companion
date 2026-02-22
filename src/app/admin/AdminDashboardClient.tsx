"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, BookOpen, FileText, Bookmark, Activity, Search } from "lucide-react";

export function AdminDashboardClient() {
    const [activeTab, setActiveTab] = useState<"overview" | "notes">("overview");

    // Overview State
    const [overviewData, setOverviewData] = useState<any>(null);
    const [isOverviewLoading, setIsOverviewLoading] = useState(true);
    const [overviewError, setOverviewError] = useState("");

    // Notes State
    const [notesData, setNotesData] = useState<any[]>([]);
    const [isNotesLoading, setIsNotesLoading] = useState(false);
    const [notesError, setNotesError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Overview Data
    useEffect(() => {
        fetch("/api/admin/metrics")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch admin metrics");
                return res.json();
            })
            .then(json => {
                setOverviewData(json);
                setIsOverviewLoading(false);
            })
            .catch(err => {
                setOverviewError(err.message);
                setIsOverviewLoading(false);
            });
    }, []);

    // Fetch Notes Data
    useEffect(() => {
        if (activeTab !== "notes") return;

        setIsNotesLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append("q", searchQuery);

        fetch(`/api/admin/notes?${params.toString()}`)
            .then(res => res.json())
            .then(json => {
                setNotesData(Array.isArray(json) ? json : []);
                setIsNotesLoading(false);
            })
            .catch(err => {
                setNotesError(err.message);
                setIsNotesLoading(false);
            });
    }, [activeTab, searchQuery]);

    if (isOverviewLoading && activeTab === "overview") {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="spinning" size={32} />
            </div>
        );
    }

    if (overviewError && activeTab === "overview") {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--destructive)' }}>
                <h3 style={{ color: 'var(--destructive)' }}>Access Error</h3>
                <p>{overviewError}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Admin Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab("overview")}
                    className={activeTab === "overview" ? "btn btn-primary" : "btn btn-outline"}
                    style={{ borderRadius: '999px', padding: '0.5rem 1.5rem' }}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab("notes")}
                    className={activeTab === "notes" ? "btn btn-primary" : "btn btn-outline"}
                    style={{ borderRadius: '999px', padding: '0.5rem 1.5rem' }}
                >
                    All Notes Explorer
                </button>
            </div>

            {/* Overview Tab Content */}
            {activeTab === "overview" && overviewData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
                    {/* Metrics Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        <MetricCard icon={<Users />} title="Total Users" value={overviewData.metrics.totalUsers} />
                        <MetricCard icon={<BookOpen />} title="Books Uploaded" value={overviewData.metrics.totalBooks} />
                        <MetricCard icon={<FileText />} title="Notes Taken" value={overviewData.metrics.totalNotes} />
                        <MetricCard icon={<Bookmark />} title="Bookmarks" value={overviewData.metrics.totalBookmarks} />
                        <MetricCard icon={<Activity />} title="Auth Sessions" value={overviewData.metrics.totalSessions} />
                    </div>

                    {/* Tables Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                        {/* Recent Users Table */}
                        <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Recent Users</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                            <th style={{ padding: '0.75rem' }}>Name</th>
                                            <th style={{ padding: '0.75rem' }}>Email</th>
                                            <th style={{ padding: '0.75rem' }}>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overviewData.recentUsers.map((user: any) => (
                                            <tr key={user.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                                <td style={{ padding: '0.75rem' }}>{user.name || 'Anonymous'}</td>
                                                <td style={{ padding: '0.75rem' }}>{user.email || 'N/A'}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '999px',
                                                        background: user.role === 'ADMIN' ? 'var(--primary)' : 'var(--muted)',
                                                        color: user.role === 'ADMIN' ? 'var(--primary-foreground)' : 'var(--foreground)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600
                                                    }}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Uploads Table */}
                        <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 600 }}>Recent Uploads</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                            <th style={{ padding: '0.75rem' }}>Title</th>
                                            <th style={{ padding: '0.75rem' }}>Uploaded By</th>
                                            <th style={{ padding: '0.75rem' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {overviewData.recentBooks.map((book: any) => (
                                            <tr key={book.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                                                <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.title}>
                                                    {book.title}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>{book.user.email}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {new Date(book.uploadedAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Notes Explorer Tab Content */}
            {activeTab === "notes" && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ position: 'relative', maxWidth: '600px', width: '100%' }}>
                        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
                        <input
                            className="input glass"
                            type="text"
                            placeholder="Global Search through ALL users' notes..."
                            style={{ paddingLeft: '3rem', fontSize: '1.1rem', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '999px', boxShadow: 'var(--shadow-md)', width: '100%' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isNotesLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                            <Loader2 className="spinning" size={32} />
                        </div>
                    ) : notesError ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--destructive)' }}>
                            <p style={{ color: 'var(--destructive)' }}>{notesError}</p>
                        </div>
                    ) : notesData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted-foreground)' }}>
                            <FileText size={48} style={{ margin: '0 auto', opacity: 0.5, marginBottom: '1rem' }} />
                            <p>No notes found matching your search.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {notesData.map(note => (
                                <div key={note.id} className="card hoverable" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Users size={14} />
                                                {note.user?.email || 'Unknown User'}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                                                {new Date(note.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', background: 'var(--muted)', padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                            Pg. {note.pageNumber}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <BookOpen size={14} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {note.book?.title || 'Unknown Book'}
                                        </span>
                                    </div>
                                    <div style={{ background: 'var(--surface-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                                            {note.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon, title, value }: { icon: React.ReactNode, title: string, value: number }) {
    return (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
                width: '48px', height: '48px',
                borderRadius: '50%',
                background: 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)'
            }}>
                {icon}
            </div>
            <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{title}</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{value.toLocaleString()}</p>
            </div>
        </div>
    );
}
