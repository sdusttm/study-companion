"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function UploadBook({ env }: { env?: { supabaseUrl: string; supabaseAnonKey: string } }) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            alert("Please upload a valid PDF file.");
            return;
        }

        const url = env?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = env?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        if (!url) {
            alert("Error: supabaseUrl is required. Please check your production environment variables.");
            return;
        }

        setIsUploading(true);

        try {
            // 1. Upload directly to Supabase Storage
            const supabase = createClient(url, key);

            const uniqueFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from("pdfs")
                .upload(uniqueFileName, file, {
                    cacheControl: "3600",
                    upsert: false
                });

            if (uploadError) {
                console.error("Supabase storage error:", uploadError);
                throw new Error("Failed to upload to Supabase Storage. Did you create a public 'pdfs' bucket?");
            }

            // 2. Register the uploaded file with our backend database
            const { data: { publicUrl } } = supabase.storage.from("pdfs").getPublicUrl(uniqueFileName);

            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    fileName: uniqueFileName,
                    filePath: publicUrl // We store the public URL directly now!
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || `Server error ${res.status}: Failed to save book record to database`);
            }

            const data = await res.json();
            router.push(`/reader/${data.book.id}`);
            router.refresh();
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to upload the book");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <>
            <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? <Loader2 size={20} className="spinning" /> : <Plus size={20} />}
                {isUploading ? "Uploading..." : "Upload Book"}
            </button>
            <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleUpload}
            />
            <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </>
    );
}
