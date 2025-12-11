import { useState, useRef } from 'react';
import './FileUpload.css';

interface FileUploadProps {
    onUpload: (file: File) => Promise<void>;
    accept?: string;
    maxSize?: number; // in MB
    disabled?: boolean;
}

export function FileUpload({
    onUpload,
    accept = '.txt,.md,.json,.js,.ts,.py,.html,.css',
    maxSize = 5,
    disabled = false
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    const processFile = async (file: File) => {
        setError(null);

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
            setError(`File too large. Maximum size is ${maxSize}MB.`);
            return;
        }

        setIsUploading(true);
        setFileName(file.name);

        try {
            await onUpload(file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className={`file-upload ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                hidden
                disabled={disabled}
            />

            <div className="upload-content">
                {isUploading ? (
                    <>
                        <div className="loading-spinner" />
                        <span>Uploading {fileName}...</span>
                    </>
                ) : (
                    <>
                        <span className="upload-icon">📁</span>
                        <span className="upload-text">
                            Drop a file here or <strong>click to browse</strong>
                        </span>
                        <span className="upload-hint">
                            Supported: text, code files. Max {maxSize}MB
                        </span>
                    </>
                )}
            </div>

            {error && <div className="upload-error">{error}</div>}
        </div>
    );
}
