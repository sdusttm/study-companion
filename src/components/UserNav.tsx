"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

export function UserNav({ user }: { user: any }) {
    if (!user) {
        return (
            <Link href="/login" className="btn btn-primary" style={{ borderRadius: '999px', padding: '0.4rem 1rem' }}>
                <span>Sign In</span>
            </Link>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                <User size={16} />
                {user.name || user.email}
            </div>
            <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="btn btn-outline"
                style={{ borderRadius: '999px', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
                <LogOut size={16} />
                <span>Log Out</span>
            </button>
        </div>
    );
}
