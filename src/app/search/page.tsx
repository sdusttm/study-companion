import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SearchClient } from "./SearchClient";

export default async function SearchPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    return <SearchClient role={(session.user as any).role || "USER"} />;
}
