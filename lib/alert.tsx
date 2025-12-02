"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

type AlertOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type AlertContextValue = {
  showAlert: (message: string, options?: AlertOptions) => Promise<boolean>;
  showConfirm: (message: string, options?: AlertOptions) => Promise<boolean>;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [confirmText, setConfirmText] = useState("ตกลง");
  const [cancelText, setCancelText] = useState("ยกเลิก");
  const [onConfirm, setOnConfirm] = useState<(() => void) | undefined>();
  const [onCancel, setOnCancel] = useState<(() => void) | undefined>();
  const [isConfirm, setIsConfirm] = useState(false);
  const [resolve, setResolve] = useState<((value: boolean) => void) | null>(
    null
  );

  const showAlert = (msg: string, options?: AlertOptions): Promise<boolean> => {
    return new Promise((res) => {
      setMessage(msg);
      setTitle(options?.title || "แจ้งเตือน");
      setDescription(options?.description || "");
      setConfirmText(options?.confirmText || "ตกลง");
      setCancelText(options?.cancelText || "ยกเลิก");
      setOnConfirm(() => options?.onConfirm);
      setOnCancel(() => options?.onCancel);
      setIsConfirm(false);
      setResolve(() => res);
      setOpen(true);
    });
  };

  const showConfirm = (
    msg: string,
    options?: AlertOptions
  ): Promise<boolean> => {
    return new Promise((res) => {
      setMessage(msg);
      setTitle(options?.title || "ยืนยัน");
      setDescription(options?.description || "");
      setConfirmText(options?.confirmText || "ยืนยัน");
      setCancelText(options?.cancelText || "ยกเลิก");
      setOnConfirm(() => options?.onConfirm);
      setOnCancel(() => options?.onCancel);
      setIsConfirm(true);
      setResolve(() => res);
      setOpen(true);
    });
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (resolve) resolve(true);
    setOpen(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (resolve) resolve(false);
    setOpen(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            )}
            {!description && (
              <AlertDialogDescription>{message}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isConfirm && (
              <AlertDialogCancel onClick={handleCancel}>
                {cancelText}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={handleConfirm}>
              {confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}

