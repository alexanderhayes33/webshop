"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useAlert } from "@/lib/alert";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
  previewClassName?: string;
};

export function ImageUpload({
  value,
  onChange,
  label = "รูปภาพ",
  required = false,
  previewClassName = ""
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAlert();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      await showAlert("กรุณาเลือกไฟล์รูปภาพเท่านั้น", {
        title: "แจ้งเตือน"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      await showAlert("ขนาดไฟล์ต้องไม่เกิน 10 MB", {
        title: "แจ้งเตือน"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      const uploadPromise = new Promise<{ url: string }>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.success && data.url) {
                resolve({ url: data.url });
              } else {
                reject(new Error(data.error || "อัปโหลดล้มเหลว"));
              }
            } catch (e) {
              reject(new Error("ไม่สามารถอ่าน response ได้"));
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `อัปโหลดล้มเหลว (${xhr.status})`));
            } catch {
              reject(new Error(`อัปโหลดล้มเหลว (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("เกิดข้อผิดพลาดในการเชื่อมต่อ"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("การอัปโหลดถูกยกเลิก"));
        });
      });

      xhr.open("POST", "/api/upload/image");
      xhr.send(formData);

      const result = await uploadPromise;
      setUploadProgress(100);
      
      onChange(result.url);
      setPreview(result.url);
      await showAlert("อัปโหลดรูปภาพสำเร็จ", {
        title: "สำเร็จ"
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadProgress(0);
      await showAlert(error.message || "เกิดข้อผิดพลาดในการอัปโหลด", {
        title: "เกิดข้อผิดพลาด"
      });
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="image-upload">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                กำลังอัปโหลด...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                อัปโหลดรูปภาพ
              </>
            )}
          </Button>
          {value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {uploading && (
          <div className="space-y-2">
            <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>กำลังอัปโหลด...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </div>
        )}
        {preview && !uploading && (
          <div
            className={`relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted ${previewClassName}`}
          >
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              onError={() => {
                setPreview(null);
              }}
            />
          </div>
        )}
        {value && (
          <div className="rounded-md border bg-muted/50 p-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              <span className="truncate">{value}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

