"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export function UploadBook() {
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

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error("Upload failed");
            }

            const data = await res.json();
            router.push(`/reader/${data.book.id}`);
            router.refresh();
        } catch (err) {
            console.error(err);
            alert("Failed to upload the book");
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
