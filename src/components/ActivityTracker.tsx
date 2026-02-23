"use client";

import { useEffect } from "react";

export function ActivityTracker() {
    useEffect(() => {
        // Fire-and-forget strictly deduplicated LOGIN event metric
        fetch('/api/activity', {
            method: 'POST',
            body: JSON.stringify({ action: 'LOGIN' })
        }).catch(() => {
            // Silently swallow errors to ensure zero obstruction to the primary user flow
        });
    }, []);

    return null;
}
