import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * Asynchronously logs a user activity on a 'best effort' basis.
 * This function is designed to NOT block the critical execution path.
 * It catches its own errors silently to prevent failing main API requests.
 */
export function logActivity(
    req: NextRequest,
    action: string,
    details?: string
) {
    // Fire and forget - do NOT await this promise
    Promise.resolve().then(async () => {
        try {
            const session = await getServerSession();
            if (!session?.user?.id) return;

            // Extract location headers (native to Vercel Deployments)
            const ipAddress = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || null;
            const userAgent = req.headers.get('user-agent') || null;

            const city = req.headers.get('x-vercel-ip-city') || null;
            const country = req.headers.get('x-vercel-ip-country') || null;

            let location = null;
            if (city && country) {
                location = `${decodeURIComponent(city)}, ${country}`;
            } else if (country) {
                location = country;
            }

            // Deduplication logic for LOGIN events
            if (action === 'LOGIN') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const existingLogin = await prisma.activityLog.findFirst({
                    where: {
                        userId: session.user.id,
                        action: 'LOGIN',
                        createdAt: {
                            gte: today
                        }
                    }
                });

                if (existingLogin) {
                    // Already logged in today from this device/IP, skip to prevent spam
                    return;
                }
            }

            await prisma.activityLog.create({
                data: {
                    userId: session.user.id,
                    action,
                    details,
                    ipAddress,
                    userAgent,
                    location
                }
            });
        } catch (error) {
            // Silently swallow errors to ensure 'best effort' logging never disrupts user experiences
            console.error('[ActivityLogger Error]', error);
        }
    });
}
