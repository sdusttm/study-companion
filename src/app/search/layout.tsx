import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SearchLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    return <>{children}</>;
}
