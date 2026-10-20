import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isDocumentAttachment, isReportAttachment, parseAttachments, type Attachment } from "@/lib/reports/attachments";

export type Criterion = {
  id: string;
  name: string;
  maxScore: number;
  sortOrder: number;
};

export type SubmitLocation = {
  lat?: number;
  lng?: number;
  address?: string;
  province?: string;
  district?: string;
  khoroo?: string;
};

export type ReportFormData = {
  reportType: string;
  reportNumber: string;
  title: string;
  implementerName: string;
  implementerRegister: string;
  approvedDate: string;
  description: string;
  hasGreenery: string;
  treeCount: string;
  spentAmount: string;
};

type SubmitTypeSlug = "plan" | "performance" | "additional" | "general-evaluation";

type SubmitType = { label: string; slug: SubmitTypeSlug };

type ReportStatus = "submitted" | "draft";

// Shape of the fields read from `/api/reports/${editId}` when editing.
type EditableReport = {
  title?: string | null;
  reportType?: { name?: string | null } | null;
  reportNumber?: string | null;
  implementerName?: string | null;
  implementerRegister?: string | null;
  approvedDate?: string | number | null;
  description?: string | null;
  hasGreenery?: boolean | null;
  treeCount?: number | null;
  spentAmount?: number | null;
  fileUrl?: string | null;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
    addressDetail?: string | null;
    province?: string | null;
    district?: string | null;
    khoroo?: string | null;
  } | null;
};

type UploadedFile = { url: string; name: string };

const PERFORMANCE_REPORT_LABEL = "Биелэлтийн тайлан";
const GENERAL_EVALUATION_LABEL = "Ерөнхий үнэлгээний дүгнэлт";

const SUBMIT_TYPES: SubmitType[] = [
  { label: "Жилийн төлөвлөгөө", slug: "plan" },
  { label: PERFORMANCE_REPORT_LABEL, slug: "performance" },
  { label: "Нэмэлт мэдээлэл", slug: "additional" },
];

// Upload one file and return the stored { url, name } entry.
async function uploadFile(file: File, purpose: string, errorMessage: string): Promise<UploadedFile> {
  const body = new FormData();
  body.append("file", file);
  body.append("purpose", purpose);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) {
    throw new Error(errorMessage);
  }
  const data = (await res.json()) as UploadedFile;
  return { url: data.url, name: data.name };
}

export function useReportSubmission() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeSlug = searchParams.get("type");
  // When present, the sender is fixing a returned report instead of creating one.
  const editId = searchParams.get("edit");
  const isEdit = !!editId;
  const activeType = SUBMIT_TYPES.find((t) => t.slug === typeSlug);
  const [editSubmitType, setEditSubmitType] = useState<SubmitTypeSlug | null>(null);
  const selectedSubmitType = activeType?.slug || editSubmitType;
  const isGeneralEvaluation = selectedSubmitType === "general-evaluation";
  // "Нэмэлт мэдээлэл" is not a full report — it only needs a short writing area.
  const isAdditional = selectedSubmitType === "additional";
  const pageTitle = isEdit ? "Тайлан засах" : activeType?.label || "Тайлан илгээх";

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [criterionFiles, setCriterionFiles] = useState<Record<string, File[]>>({});
  const [submitError, setSubmitError] = useState("");
  // Attachments already saved on the report being edited (kept unless removed).
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [existingCriterionAttachments, setExistingCriterionAttachments] = useState<Record<string, Attachment[]>>({});
  const [initialLocation, setInitialLocation] = useState<SubmitLocation | null>(null);
  const [location, setLocation] = useState<SubmitLocation | null>(null);
  const [formData, setFormData] = useState<ReportFormData>({
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

  useEffect(() => {
    if (typeSlug === "general-evaluation") {
      router.replace("/sender/submit");
    }
  }, [router, typeSlug]);

  useEffect(() => {
    if (isGeneralEvaluation || isAdditional) return;
    (async () => {
      const res = await fetch("/api/criteria");
      if (!res.ok) return;
      const data = (await res.json()) as Criterion[];
      setCriteria(data);
    })();
  }, [isAdditional, isGeneralEvaluation]);

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
      const r = (await res.json()) as EditableReport;
      const savedAttachments = parseAttachments(r.fileUrl);
      const isSavedGeneralEvaluation = r.title === GENERAL_EVALUATION_LABEL;
      if (isSavedGeneralEvaluation) {
        router.replace("/sender/reports");
        return;
      }
      setEditSubmitType(null);
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
        savedAttachments.filter((file) =>
          isSavedGeneralEvaluation ? isDocumentAttachment(file) : !file.criterionId && isReportAttachment(file),
        ),
      );
      setExistingCriterionAttachments(
        savedAttachments
          .filter((file) => !isSavedGeneralEvaluation && file.criterionId && isReportAttachment(file))
          .reduce((acc: Record<string, Attachment[]>, file) => {
            const criterionId = file.criterionId as string;
            acc[criterionId] = [...(acc[criterionId] || []), file];
            return acc;
          }, {}),
      );
    })();
  }, []);

  const handleChange = (
    e: ChangeEvent<
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

  const handleCriterionFilesChange = (criterionId: string, files: File[]) => {
    setCriterionFiles((prev) => ({ ...prev, [criterionId]: files }));
  };

  const handleExistingCriterionFilesChange = (criterionId: string, files: Attachment[]) => {
    setExistingCriterionAttachments((prev) => ({ ...prev, [criterionId]: files }));
  };

  const handleRemoveExistingAttachment = (index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload newly picked files and return them as { url, name } entries.
  const uploadAttachments = async () => {
    const uploaded: UploadedFile[] = [];
    for (const file of attachedFiles) {
      uploaded.push(await uploadFile(file, "report-attachment", "Attachment upload failed"));
    }
    return uploaded;
  };

  const uploadCriterionAttachments = async () => {
    const uploaded: Attachment[] = [];
    for (const [criterionId, files] of Object.entries(criterionFiles)) {
      for (const file of files) {
        const data = await uploadFile(file, "report-attachment", "Criterion attachment upload failed");
        uploaded.push({ url: data.url, name: data.name, criterionId });
      }
    }
    return uploaded;
  };

  const uploadDocuments = async () => {
    const uploaded: UploadedFile[] = [];
    for (const file of documentFiles) {
      uploaded.push(await uploadFile(file, "report-document", "Document upload failed"));
    }
    return uploaded;
  };

  // Combine the kept existing attachments with any newly uploaded files into the
  // JSON string stored on the report. Preserves the sender's original files when
  // editing, while letting them add more.
  const buildFileUrl = async () => {
    const uploaded = isGeneralEvaluation ? await uploadDocuments() : await uploadAttachments();
    const uploadedCriterionFiles = isGeneralEvaluation ? [] : await uploadCriterionAttachments();
    const keptAttachments = existingAttachments.filter(
      isGeneralEvaluation ? isDocumentAttachment : isReportAttachment,
    );
    const keptCriterionAttachments = isGeneralEvaluation ? [] : Object.values(existingCriterionAttachments).flat();
    const combined = [...keptAttachments, ...keptCriterionAttachments, ...uploaded, ...uploadedCriterionFiles];
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

  // A general evaluation must carry at least one document (saved or new).
  const isMissingGeneralEvaluationFile = () =>
    isGeneralEvaluation && existingAttachments.length === 0 && documentFiles.length === 0;

  // Upload files, then create the report or update the one being edited.
  const sendReport = async (status: ReportStatus) => {
    const fileUrl = await buildFileUrl();
    return fetch(isEdit ? `/api/reports/${editId}` : "/api/reports/create", {
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
        status,
      }),
    });
  };

  const handleReset = () => {
    setSubmitted(false);
    setAttachedFiles([]);
    setDocumentFiles([]);
    setCriterionFiles({});
    setExistingCriterionAttachments({});
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

  const handleBackToReports = () => {
    router.push("/sender/reports");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isMissingGeneralEvaluationFile()) {
      setSubmitError("Ерөнхий үнэлгээний дүгнэлтийн файл хавсаргана уу.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await sendReport("submitted");
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
    if (isMissingGeneralEvaluationFile()) {
      setSubmitError("Ерөнхий үнэлгээний дүгнэлтийн файл хавсаргана уу.");
      return;
    }
    setSavingDraft(true);
    try {
      const response = await sendReport("draft");
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

  return {
    activeType,
    isEdit,
    isGeneralEvaluation,
    isAdditional,
    pageTitle,
    submitted,
    submitting,
    savingDraft,
    attachedFiles,
    documentFiles,
    criteria,
    criterionFiles,
    submitError,
    existingAttachments,
    existingCriterionAttachments,
    initialLocation,
    formData,
    setLocation,
    handleChange,
    handleFileChange,
    handleDocumentChange,
    handleCriterionFilesChange,
    handleExistingCriterionFilesChange,
    handleRemoveExistingAttachment,
    handleReset,
    handleBackToReports,
    handleSubmit,
    handleSaveDraft,
  };
}
