"use client";

import { useState, useRef } from "react";
import { Loader2, Plus, FileText, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@supabase/supabase-js";

export function UploadBook({ env, existingBooks }: {
    env?: { supabaseUrl: string; supabaseAnonKey: string },
    existingBooks?: { id: string, title: string }[]
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingFileName, setUploadingFileName] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            alert("Please upload a valid PDF file.");
            return;
        }

        const title = file.name.replace(/\.[^/.]+$/, "");
        const existingBook = existingBooks?.find(b => b.title === title);

        if (existingBook) {
            if (window.confirm(`You already have a book named "${existingBook.title}". Do you want to open it instead of uploading a duplicate?`)) {
                router.push(`/reader/${existingBook.id}`);
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
        }

        const url = env?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = env?.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

        if (!url) {
            alert("Error: supabaseUrl is required. Please check your production environment variables.");
            return;
        }

        setUploadingFileName(file.name);
        setIsUploading(true);
        setUploadSuccess(false);

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
                    title: title,
                    fileName: uniqueFileName,
                    filePath: publicUrl // We store the public URL directly now!
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.error || `Server error ${res.status}: Failed to save book record to database`);
            }

            const data = await res.json();

            setUploadSuccess(true);

            // Short delay so user can feel the success state visually
            setTimeout(() => {
                router.push(`/reader/${data.book.id}`);
                router.refresh();
                // Reset state after transition
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadSuccess(false);
                }, 500);
            }, 1200);

        } catch (err: any) {
            console.error(err);
            alert(err.message || "Failed to upload the book");
            setIsUploading(false);
            setUploadSuccess(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <>
            <button
                className="btn btn-primary glow-on-hover"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                <Plus size={20} className="plus-icon" />
                Upload Book
            </button>
            <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleUpload}
            />

            {isUploading && (
                <div className="upload-overlay animate-fade-in">
                    <div className="upload-modal animate-slide-up">
                        <div className="upload-icon-container">
                            {uploadSuccess ? (
                                <CheckCircle2 size={56} className="success-icon animate-bounce-in" />
                            ) : (
                                <div className="pulse-ring">
                                    <FileText size={40} className="uploading-icon" />
                                </div>
                            )}
                        </div>
                        <h3 className="upload-title">
                            {uploadSuccess ? "Upload Complete!" : "Uploading Document..."}
                        </h3>
                        <p className="upload-filename" title={uploadingFileName}>
                            {uploadingFileName}
                        </p>

                        {!uploadSuccess && (
                            <div className="progress-bar-container">
                                <div className="progress-bar-indeterminate"></div>
                            </div>
                        )}

                        {uploadSuccess && (
                            <p className="redirect-text">Redirecting to reader...</p>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .glow-on-hover {
                    position: relative;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .glow-on-hover:hover:not(:disabled) {
                    box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.4);
                    transform: translateY(-2px);
                }
                .plus-icon {
                    transition: transform 0.3s ease;
                }
                .glow-on-hover:hover:not(:disabled) .plus-icon {
                    transform: scale(1.2) rotate(90deg);
                }

                .upload-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                }
                .upload-modal {
                    background: var(--background);
                    border: 1px solid var(--border);
                    border-radius: 1.5rem;
                    width: 100%;
                    max-width: 420px;
                    padding: 2.5rem 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(var(--primary-rgb), 0.1);
                    position: relative;
                    overflow: hidden;
                }
                .upload-modal::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, transparent, var(--primary), transparent);
                    animation: shimmer 2s infinite linear;
                }
                
                .upload-icon-container {
                    height: 96px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                
                .pulse-ring {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    background: rgba(var(--primary-rgb), 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .pulse-ring::before {
                    content: '';
                    position: absolute;
                    left: -10px;
                    top: -10px;
                    right: -10px;
                    bottom: -10px;
                    border-radius: 50%;
                    border: 2px solid rgba(var(--primary-rgb), 0.3);
                    animation: pulse 1.5s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
                }
                .pulse-ring::after {
                    content: '';
                    position: absolute;
                    left: -20px;
                    top: -20px;
                    right: -20px;
                    bottom: -20px;
                    border-radius: 50%;
                    border: 2px solid rgba(var(--primary-rgb), 0.1);
                    animation: pulse 1.5s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
                    animation-delay: 0.4s;
                }
                
                .uploading-icon {
                    color: var(--primary);
                    animation: float 2s infinite ease-in-out;
                }
                .success-icon {
                    color: #10b981; /* emerald-500 */
                    filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.4));
                }
                
                .upload-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                    color: var(--foreground);
                }
                
                .upload-filename {
                    color: var(--muted-foreground);
                    font-size: 0.95rem;
                    margin: 0 0 2rem 0;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    padding: 0 1rem;
                }
                
                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background: var(--muted);
                    border-radius: 999px;
                    overflow: hidden;
                    position: relative;
                }
                
                .progress-bar-indeterminate {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    width: 50%;
                    background: linear-gradient(90deg, transparent, var(--primary), transparent);
                    border-radius: 999px;
                    animation: slide 1.5s infinite ease-in-out;
                }
                
                .redirect-text {
                    color: #10b981;
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin: 0;
                    animation: pulse-opacity 1.5s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(0.8); opacity: 1; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes shimmer {
                    0% { background-position: -200px 0; }
                    100% { background-position: 200px 0; }
                }
                @keyframes pulse-opacity {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease forwards;
                }
                .animate-slide-up {
                    animation: slideUpModal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-bounce-in {
                    animation: bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUpModal {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes bounceIn {
                    0% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 1; transform: scale(1.1); }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </>
    );
}
