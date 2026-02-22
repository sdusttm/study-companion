import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);

    // STRICT ROLE CHECK: Redirect non-admins away instantly
    if (!session || !session.user || (session.user as any).role !== "ADMIN") {
        redirect("/");
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '2rem' }}>
                Admin Dashboard
            </h1>
            <AdminDashboardClient />
        </div>
    );
}
