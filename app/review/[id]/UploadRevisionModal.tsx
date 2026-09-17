"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface UploadRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  currentVersionNumber: number;
}

export function UploadRevisionModal({
  isOpen,
  onClose,
  contractId,
  contractName,
  currentVersionNumber,
}: UploadRevisionModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  }

  function validateAndSetFile(file: File) {
    setErrorMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setErrorMessage("Please upload a PDF or DOCX file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be under 10 MB.");
      return;
    }
    setSelectedFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }

  async function handleStartRevisionReview() {
    if (!selectedFile) {
      setErrorMessage("Please select a revised contract file to upload.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressPercent(15);
    setCurrentStep("Uploading revised document to deal workspace...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Step 1: Upload version
      const uploadRes = await fetch(`/api/contracts/${contractId}/versions`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload revised contract.");
      }

      const nextVersionNumber = uploadData.versionNumber || currentVersionNumber + 1;

      setProgressPercent(45);
      setCurrentStep("Extracting clauses & comparing with previous version...");

      // Step 2: Trigger analysis & comparison pipeline
      const analyzeRes = await fetch(`/api/contracts/${contractId}/analyze`, {
        method: "POST",
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok || !analyzeData.success) {
        throw new Error(analyzeData.error || "Failed to analyze revised contract.");
      }

      setProgressPercent(90);
      setCurrentStep("Synthesizing comparison report and changes...");

      setTimeout(() => {
        setProgressPercent(100);
        setCurrentStep("Revision analysis complete!");
        setIsProcessing(false);
        onClose();
        router.push(`/review/${contractId}?v=${nextVersionNumber}`);
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      console.error("Revision review error:", err);
      setIsProcessing(false);
      setErrorMessage(err instanceof Error ? err.message : "An error occurred while analyzing the revision.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200">
        {/* Close Button */}
        {!isProcessing && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              <span>🔄</span> Version {currentVersionNumber + 1} Revision
            </span>
            <span className="text-xs text-slate-500 truncate max-w-[240px]">
              Deal: {contractName}
            </span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
            Upload Revised Contract
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
            Received an updated version from the other party? Upload it here and PactIQ will compare it with Version {currentVersionNumber}, your earlier review, and your previous negotiations.
          </p>
        </div>

        {/* Processing View */}
        {isProcessing ? (
          <div className="my-8 flex flex-col items-center justify-center text-center space-y-4 py-6">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse" />
              <div className="h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">{currentStep}</h3>
              <p className="text-xs text-slate-500">Connecting changes to previous findings & negotiation requests...</p>
            </div>

            <div className="w-full max-w-sm rounded-full bg-slate-100 h-2 overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : (
          /* File Upload Dropzone */
          <div className="space-y-5">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-400"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-xl font-bold">
                    📄
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[280px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 mt-1">
                    Ready to compare
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xl">
                    📁
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="text-blue-600 hover:underline">Click to browse</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">PDF or DOCX documents up to 10 MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRevisionReview}
                disabled={!selectedFile}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold text-white shadow-xs transition ${
                  selectedFile
                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95"
                    : "bg-slate-300 cursor-not-allowed text-slate-500"
                }`}
              >
                <span>Upload & Compare Revision</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
