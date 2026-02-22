"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, BookOpen, FileText, Bookmark, Activity } from "lucide-react";

export function AdminDashboardClient() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/admin/metrics")
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch admin metrics");
                return res.json();
            })
            .then(json => {
                setData(json);
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="spinning" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--destructive)' }}>
                <h3 style={{ color: 'var(--destructive)' }}>Access Error</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
            }}>
                <MetricCard icon={<Users />} title="Total Users" value={data.metrics.totalUsers} />
                <MetricCard icon={<BookOpen />} title="Books Uploaded" value={data.metrics.totalBooks} />
                <MetricCard icon={<FileText />} title="Notes Taken" value={data.metrics.totalNotes} />
                <MetricCard icon={<Bookmark />} title="Bookmarks" value={data.metrics.totalBookmarks} />
                <MetricCard icon={<Activity />} title="Auth Sessions" value={data.metrics.totalSessions} />
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
                                {data.recentUsers.map((user: any) => (
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
                                {data.recentBooks.map((book: any) => (
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
