import { useState, useEffect } from "react";
import { Loader2, Monitor, Globe, ChevronLeft, ChevronRight, Activity } from "lucide-react";

export function AdminActivityLog() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ pages: 1, total: 0 });

    useEffect(() => {
        setIsLoading(true);
        fetch(`/api/admin/activity?page=${page}&limit=20`)
            .then(res => res.json())
            .then(json => {
                if (json.error) throw new Error(json.error);
                setLogs(json.logs || []);
                setPagination(json.pagination || { pages: 1, total: 0 });
                setIsLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setIsLoading(false);
            });
    }, [page]);

    if (isLoading && logs.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <Loader2 className="spinning" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--destructive)' }}>
                <p style={{ color: 'var(--destructive)' }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity color="var(--primary)" /> System Activity Logs
                </h2>
                <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
                    Total Records: <strong>{pagination.total.toLocaleString()}</strong>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-bg)' }}>
                                <th style={{ padding: '1rem' }}>Time</th>
                                <th style={{ padding: '1rem' }}>User</th>
                                <th style={{ padding: '1rem' }}>Action</th>
                                <th style={{ padding: '1rem' }}>Context</th>
                                <th style={{ padding: '1rem' }}>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-border)' }} className="hoverable">
                                    <td style={{ padding: '1rem', whiteSpace: 'nowrap', color: 'var(--muted-foreground)' }}>
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 500 }}>{log.user?.name || "Anonymous"}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{log.user?.email || "N/A"}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: log.action === 'LOGIN' ? 'var(--blue-900)' : 'var(--muted)',
                                            color: log.action === 'LOGIN' ? 'var(--blue-400)' : 'var(--foreground)',
                                            fontSize: '0.75rem',
                                            fontWeight: 700
                                        }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.details || ''}>
                                        {log.details || <span style={{ color: 'var(--muted-foreground)' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                                            <Globe size={14} color="var(--muted-foreground)" />
                                            {log.location || <span style={{ color: 'var(--muted-foreground)' }}>Local / Unknown</span>}
                                        </div>
                                        {log.ipAddress && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}>
                                                <Monitor size={12} />
                                                {log.ipAddress}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        No activity logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        className="btn btn-outline"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        style={{ padding: '0.5rem' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        Page {page} of {pagination.pages}
                    </span>
                    <button
                        className="btn btn-outline"
                        disabled={page === pagination.pages}
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        style={{ padding: '0.5rem' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
