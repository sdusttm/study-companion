import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();

        // Only accept LOGIN actions from the client to prevent abuse
        if (payload.action === 'LOGIN') {
            logActivity(req, 'LOGIN');
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to process activity" }, { status: 500 });
    }
}
