"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReportInfoCard from "@/components/ReportInfoCard";
import LocationCard from "@/components/LocationCard";
import AttachmentCard from "@/components/AttachmentCard";
import DocumentUploadCard from "@/components/DocumentUploadCard";
import { HiCheckCircle } from "react-icons/hi";
import { isDocumentAttachment, isReportAttachment, parseAttachments, type Attachment } from "@/lib/attachments";
import { senderSidebarItems, type SenderNavKey } from "@/lib/senderNav";

const PERFORMANCE_REPORT_LABEL = "Биелэлтийн тайлан";
const GENERAL_EVALUATION_LABEL = "Ерөнхий үнэлгээний дүгнэлт";

const SUBMIT_TYPES = [
  { label: "Жилийн төлөвлөгөө", slug: "plan" },
  { label: PERFORMANCE_REPORT_LABEL, slug: "performance" },
  { label: GENERAL_EVALUATION_LABEL, slug: "general-evaluation" },
  { label: "Нэмэлт мэдээлэл", slug: "additional" },
];

export default function SubmitReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeSlug = searchParams.get("type");
  // When present, the sender is fixing a returned report instead of creating one.
  const editId = searchParams.get("edit");
  const isEdit = !!editId;
  const activeType = SUBMIT_TYPES.find((t) => t.slug === typeSlug);
  const [editSubmitType, setEditSubmitType] = useState<SenderNavKey | null>(null);
  const selectedSubmitType = (typeSlug as SenderNavKey | null) || editSubmitType;
  const isGeneralEvaluation = selectedSubmitType === "general-evaluation";
  // "Нэмэлт мэдээлэл" is not a full report — it only needs a short writing area.
  const isAdditional = selectedSubmitType === "additional";
  const pageTitle = isEdit ? "Тайлан засах" : activeType?.label || "Тайлан илгээх";

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState("");
  // Attachments already saved on the report being edited (kept unless removed).
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [initialLocation, setInitialLocation] = useState<{
    lat?: number;
    lng?: number;
    address?: string;
    province?: string;
    district?: string;
    khoroo?: string;
  } | null>(null);
  const [location, setLocation] = useState<{
    lat?: number;
    lng?: number;
    address?: string;
    province?: string;
    district?: string;
    khoroo?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    reportType: "",
    reportNumber: "",
    title: "",
    implementerName: "",
    implementerRegister: "",
    approvedDate: "",
    description: "",
    hasGreenery: "",
    treeCount: "",
    spentAmount: "",
  });

  // Keep report type locked to the selected sidebar type (create mode only).
  useEffect(() => {
    if (isEdit) return;
    setFormData((prev) => ({
      ...prev,
      reportType: isGeneralEvaluation ? PERFORMANCE_REPORT_LABEL : activeType?.label || "",
      title: isGeneralEvaluation
        ? GENERAL_EVALUATION_LABEL
        : prev.title === GENERAL_EVALUATION_LABEL
        ? ""
        : prev.title,
    }));
  }, [activeType?.label, isEdit, isGeneralEvaluation]);

  // Load the existing report so the sender can edit and resubmit it with their
  // previously filled information pre-populated.
  useEffect(() => {
    if (!editId) return;
    (async () => {
      const res = await fetch(`/api/reports/${editId}`);
      if (!res.ok) return;
      const r = await res.json();
      const savedAttachments = parseAttachments(r.fileUrl);
      const hasDocuments = savedAttachments.some(isDocumentAttachment);
      setEditSubmitType(
        r.title === GENERAL_EVALUATION_LABEL || hasDocuments ? "general-evaluation" : null,
      );
      setFormData({
        reportType: r.reportType?.name || "",
        reportNumber: r.reportNumber || "",
        title: r.title || "",
        implementerName: r.implementerName || "",
        implementerRegister: r.implementerRegister || "",
        approvedDate: r.approvedDate ? String(r.approvedDate).slice(0, 10) : "",
        description: r.description || "",
        hasGreenery: r.hasGreenery == null ? "" : r.hasGreenery ? "yes" : "no",
        treeCount: r.treeCount != null ? String(r.treeCount) : "",
        spentAmount: r.spentAmount != null ? String(r.spentAmount) : "",
      });
      if (r.location) {
        setInitialLocation({
          lat: r.location.latitude ?? undefined,
          lng: r.location.longitude ?? undefined,
          address: r.location.addressDetail ?? undefined,
          province: r.location.province ?? undefined,
          district: r.location.district ?? undefined,
          khoroo: r.location.khoroo ?? undefined,
        });
      }
      setExistingAttachments(
        savedAttachments.filter(hasDocuments ? isDocumentAttachment : isReportAttachment),
      );
    })();
  }, [editId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (files: File[]) => {
    setAttachedFiles(files);
  };

  const handleDocumentChange = (files: File[]) => {
    setDocumentFiles(files);
    setSubmitError("");
  };

  // Upload newly picked files and return them as { url, name } entries.
  const uploadAttachments = async () => {
    const uploaded: { url: string; name: string }[] = [];
    for (const file of attachedFiles) {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", "report-attachment");
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        throw new Error("Attachment upload failed");
      }
      const data = await res.json();
      uploaded.push({ url: data.url, name: data.name });
    }
    return uploaded;
  };

  const uploadDocuments = async () => {
    const uploaded: { url: string; name: string }[] = [];
    for (const file of documentFiles) {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", "report-document");
      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        throw new Error("Document upload failed");
      }
      const data = await res.json();
      uploaded.push({ url: data.url, name: data.name });
    }
    return uploaded;
  };

  // Combine the kept existing attachments with any newly uploaded files into the
  // JSON string stored on the report. Preserves the sender's original files when
  // editing, while letting them add more.
  const buildFileUrl = async () => {
    const uploaded = isGeneralEvaluation ? await uploadDocuments() : await uploadAttachments();
    const keptAttachments = existingAttachments.filter(
      isGeneralEvaluation ? isDocumentAttachment : isReportAttachment,
    );
    const combined = [...keptAttachments, ...uploaded];
    return combined.length ? JSON.stringify(combined) : "";
  };

  // Map the picked map location into the fields the create API expects.
  const locationData = () =>
    location
      ? {
          latitude: location.lat,
          longitude: location.lng,
          addressDetail: location.address,
          province: location.province,
          district: location.district,
          khoroo: location.khoroo,
        }
      : {};

  const handleReset = () => {
    setSubmitted(false);
    setAttachedFiles([]);
    setDocumentFiles([]);
    setSubmitError("");
    setFormData({
      reportType: isGeneralEvaluation ? PERFORMANCE_REPORT_LABEL : activeType?.label || "",
      reportNumber: "",
      title: isGeneralEvaluation ? GENERAL_EVALUATION_LABEL : "",
      implementerName: "",
      implementerRegister: "",
      approvedDate: "",
      description: "",
      hasGreenery: "",
      treeCount: "",
      spentAmount: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isGeneralEvaluation && existingAttachments.length === 0 && documentFiles.length === 0) {
      setSubmitError("Ерөнхий үнэлгээний дүгнэлтийн файл хавсаргана уу.");
      return;
    }
    setSubmitting(true);
    try {
      const fileUrl = await buildFileUrl();
      const response = await fetch(isEdit ? `/api/reports/${editId}` : "/api/reports/create", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...(isGeneralEvaluation ? {} : locationData()),
          reportType: isGeneralEvaluation ? PERFORMANCE_REPORT_LABEL : formData.reportType,
          title: isGeneralEvaluation ? GENERAL_EVALUATION_LABEL : formData.title,
          hasGreenery: "",
          treeCount: "",
          spentAmount: "",
          fileUrl,
          attachmentKind: isGeneralEvaluation ? "document" : "report",
          status: "submitted",
        }),
      });
      if (response.ok) {
        setSubmitted(true);
      } else {
        setSubmitError("Илгээх үед алдаа гарлаа. Дахин оролдоно уу.");
      }
    } catch {
      setSubmitError("Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isGeneralEvaluation && existingAttachments.length === 0 && documentFiles.length === 0) {
      setSubmitError("Ерөнхий үнэлгээний дүгнэлтийн файл хавсаргана уу.");
      return;
    }
    setSavingDraft(true);
    try {
      const fileUrl = await buildFileUrl();
      const response = await fetch(isEdit ? `/api/reports/${editId}` : "/api/reports/create", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ...(isGeneralEvaluation ? {} : locationData()),
          reportType: isGeneralEvaluation ? PERFORMANCE_REPORT_LABEL : formData.reportType,
          title: isGeneralEvaluation ? GENERAL_EVALUATION_LABEL : formData.title,
          hasGreenery: "",
          treeCount: "",
          spentAmount: "",
          fileUrl,
          attachmentKind: isGeneralEvaluation ? "document" : "report",
          status: "draft",
        }),
      });
      if (response.ok) {
        router.push("/sender/drafts");
      } else {
        setSubmitError("Хадгалах үед алдаа гарлаа. Дахин оролдоно уу.");
      }
    } catch {
      setSubmitError("Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={senderSidebarItems(selectedSubmitType ?? undefined)} />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userName="Илгээх хэрэглэгч"
          companyName="Илгээх байгууллага"
          companyType="sender"
        />
        <main className="flex-1 min-w-0 p-6">
          {submitted ? (
            <div
              className="bg-white rounded-3xl overflow-hidden p-16 text-center"
              style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
            >
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
                  <HiCheckCircle size={48} className="text-emerald-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {isGeneralEvaluation ? "Дүгнэлт амжилттай илгээгдлээ!" : "Тайлан амжилттай илгээгдлээ!"}
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                {isGeneralEvaluation
                  ? "Таны ерөнхий үнэлгээний дүгнэлт амжилттай хүлээн авлаа."
                  : "Хянах байгууллага таны тайланг хянаж үнэлгээ өгөх болно."}
              </p>
              <div className="flex items-center justify-center mt-8">
                {isEdit ? (
                  <button
                    type="button"
                    onClick={() => router.push("/sender/reports")}
                    className="h-11 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center"
                  >
                    Миний тайлангууд руу буцах
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="h-11 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center"
                  >
                    {isGeneralEvaluation ? "Дахин дүгнэлт илгээх" : "Дахин тайлан илгээх"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
            >
              {/* Card Header */}
              <div className="px-10 py-6 border-b border-[#E8F0FE]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-color-primary flex items-center justify-center flex-shrink-0">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-color-text-main">
                        {pageTitle}
                      </h1>
                      <p className="text-sm text-color-text-muted mt-0.5">
                        {isAdditional
                          ? "Нэмэлт мэдээллээ бичнэ үү."
                          : isGeneralEvaluation
                          ? "Ерөнхий үнэлгээний дүгнэлтийн PDF эсвэл Word файлыг хавсаргана уу."
                          : "Тайлангийн мэдээлэл болон байршлын хаягийг оруулна уу."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <form onSubmit={handleSubmit} className="p-10">
                {isAdditional ? (
                  /* Нэмэлт мэдээлэл — writing only, not a full report. */
                  <div className="border border-[#E8F0FE] rounded-2xl p-6">
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-color-text-main mb-1.5">
                        Гарчиг <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Нэмэлт мэдээллийн гарчиг"
                        required
                        className="w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-color-text-main mb-1.5">
                        Агуулга <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Нэмэлт мэдээллээ энд бичнэ үү..."
                        rows={10}
                        required
                        className="w-full rounded-xl border border-[#D9E4F0] bg-white px-4 py-3 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y"
                      />
                    </div>
                  </div>
                ) : isGeneralEvaluation ? (
                  <div className="max-w-3xl">
                    {isEdit && existingAttachments.length > 0 && (
                      <div className="mb-4 border border-[#E8F0FE] rounded-2xl p-4">
                        <p className="text-sm font-semibold text-color-text-main mb-2">
                          Хадгалагдсан файл
                        </p>
                        <div className="space-y-2">
                          {existingAttachments.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FBFF] border border-[#E8F0FE]"
                            >
                              <span className="text-sm text-color-text-main flex-1 min-w-0 truncate">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
                                }
                                className="text-color-text-muted hover:text-red-500 transition text-xs p-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <DocumentUploadCard
                      attachedFiles={documentFiles}
                      onFileChange={handleDocumentChange}
                    />
                    {submitError && (
                      <p className="mt-3 text-sm font-medium text-red-500">{submitError}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-8">
                      {/* Left: Report Info */}
                      <div className="col-span-2">
                        <ReportInfoCard
                          formData={formData}
                          handleChange={handleChange}
                          lockedType={activeType?.label}
                        />
                      </div>
                      {/* Right: Attachment */}
                      <div className="col-span-1 space-y-3">
                        {isEdit && existingAttachments.length > 0 && (
                          <div className="border border-[#E8F0FE] rounded-2xl p-4">
                            <p className="text-sm font-semibold text-color-text-main mb-2">
                              Хадгалагдсан файл
                            </p>
                            <div className="space-y-2">
                              {existingAttachments.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FBFF] border border-[#E8F0FE]"
                                >
                                  <span className="text-sm text-color-text-main flex-1 min-w-0 truncate">
                                    {file.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
                                    }
                                    className="text-color-text-muted hover:text-red-500 transition text-xs p-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <AttachmentCard
                          attachedFiles={attachedFiles}
                          onFileChange={handleFileChange}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="mt-8">
                      <LocationCard
                        onLocationChange={setLocation}
                        initialLocation={initialLocation}
                        register={formData.implementerRegister}
                      />
                    </div>
                  </>
                )}

                {submitError && !isGeneralEvaluation && (
                  <p className="mt-4 text-sm font-medium text-red-500">{submitError}</p>
                )}

                {/* Action Buttons — Нэмэлт мэдээлэл has no submit action. */}
                {!isAdditional && (
                <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-[#E8F0FE]">
                  {!isGeneralEvaluation && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className="h-11 px-6 rounded-xl border border-[#D9E4F0] bg-white text-color-text-main text-sm font-semibold hover:bg-slate-50 transition inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingDraft ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-color-primary border-t-transparent" />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      )}
                      {savingDraft ? "Хадгалж байна..." : "Ноорог хадгалах"}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-7 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center gap-2 disabled:opacity-50"
                    style={{ boxShadow: "0 4px 12px rgba(37,99,235,0.3)" }}
                  >
                    {submitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    )}
                    {submitting
                      ? "Илгээж байна..."
                      : isGeneralEvaluation
                      ? "Дүгнэлт илгээх"
                      : "Тайлан илгээх"}
                  </button>
                </div>
                )}
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
