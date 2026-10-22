import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isDocumentAttachment, isReportAttachment, parseAttachments, type Attachment } from "@/lib/reports/attachments";
import { materialsFor } from "@/lib/reports/materials";
import { toast } from "@/lib/toast";

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
  reportCategory: string;
  reportNumber: string;
  title: string;
  approvedDate: string;
  description: string;
  hasGreenery: string;
  treeCount: string;
  spentAmount: string;
};

type SubmitTypeSlug = "plan" | "performance" | "general-evaluation";

type SubmitType = { label: string; slug: SubmitTypeSlug };

type ReportStatus = "submitted" | "draft";

// Shape of the fields read from `/api/reports/${editId}` when editing.
type EditableReport = {
  title?: string | null;
  reportType?: { name?: string | null } | null;
  reportCategory?: string | null;
  reportNumber?: string | null;
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
  const pageTitle = isEdit ? "Тайлан засах" : activeType?.label || "Тайлан илгээх";

  const [submitted, setSubmitted] = useState(false);
  // Number the server assigned to the report that was just sent.
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);
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
  const [materialFiles, setMaterialFiles] = useState<Record<string, File[]>>({});
  const [existingMaterialAttachments, setExistingMaterialAttachments] = useState<Record<string, Attachment[]>>({});
  const [initialLocation, setInitialLocation] = useState<SubmitLocation | null>(null);
  const [location, setLocation] = useState<SubmitLocation | null>(null);
  const [formData, setFormData] = useState<ReportFormData>({
    reportType: activeType?.label || "",
    reportCategory: "",
    reportNumber: "",
    title: "",
    approvedDate: "",
    description: "",
    hasGreenery: "",
    treeCount: "",
    spentAmount: "",
  });
  // The regulation's scoring sheets are for performance reports only. Plans and
  // performance reports each attach the documents their "Тайлангийн төрөл"
  // requires (lib/reports/materials.ts); the other forms attach general files only.
  const isPerformanceReport = !isGeneralEvaluation && formData.reportType === PERFORMANCE_REPORT_LABEL;
  const materials = isGeneralEvaluation ? [] : materialsFor(formData.reportType, formData.reportCategory);
  const materialIds = new Set(materials.map((material) => material.id));

  useEffect(() => {
    if (typeSlug === "general-evaluation") {
      router.replace("/sender/submit");
    }
  }, [router, typeSlug]);

  // Evidence rows follow the scoring sheet of the chosen "Тайлангийн төрөл", so
  // they load once the sender picks it and reload when it changes.
  const reportCategory = formData.reportCategory;
  useEffect(() => {
    if (!isPerformanceReport || !reportCategory) {
      setCriteria([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/criteria?${new URLSearchParams({ category: reportCategory })}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as Criterion[];
      if (!cancelled) setCriteria(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isPerformanceReport, reportCategory]);

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
        reportCategory: r.reportCategory || "",
        reportNumber: r.reportNumber || "",
        title: r.title || "",
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
          isSavedGeneralEvaluation
            ? isDocumentAttachment(file)
            : !file.criterionId && !file.materialId && isReportAttachment(file),
        ),
      );
      setExistingMaterialAttachments(
        savedAttachments
          .filter((file) => !isSavedGeneralEvaluation && file.materialId && isReportAttachment(file))
          .reduce((acc: Record<string, Attachment[]>, file) => {
            const materialId = file.materialId as string;
            acc[materialId] = [...(acc[materialId] || []), file];
            return acc;
          }, {}),
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

  const handleMaterialFilesChange = (materialId: string, files: File[]) => {
    setMaterialFiles((prev) => ({ ...prev, [materialId]: files }));
  };

  const handleExistingMaterialFilesChange = (materialId: string, files: Attachment[]) => {
    setExistingMaterialAttachments((prev) => ({ ...prev, [materialId]: files }));
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

  const criterionIds = new Set(criteria.map((criterion) => criterion.id));

  const uploadCriterionAttachments = async () => {
    const uploaded: Attachment[] = [];
    for (const [criterionId, files] of Object.entries(criterionFiles)) {
      // Files picked for another category's sheet before it changed are dropped.
      if (!criterionIds.has(criterionId)) continue;
      for (const file of files) {
        const data = await uploadFile(file, "report-attachment", "Criterion attachment upload failed");
        uploaded.push({ url: data.url, name: data.name, criterionId });
      }
    }
    return uploaded;
  };

  // Only the current category's materials are kept, in case the sender switched
  // "Тайлангийн төрөл" after picking files.
  const uploadMaterialAttachments = async () => {
    const uploaded: Attachment[] = [];
    for (const [materialId, files] of Object.entries(materialFiles)) {
      if (!materialIds.has(materialId)) continue;
      for (const file of files) {
        const data = await uploadFile(file, "report-attachment", "Material attachment upload failed");
        uploaded.push({ url: data.url, name: data.name, materialId });
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
    // Plans no longer show evidence rows, but evidence saved on older plans is kept.
    const keptCriterionAttachments = isGeneralEvaluation
      ? []
      : Object.entries(existingCriterionAttachments)
          .filter(([criterionId]) => !isPerformanceReport || criterionIds.has(criterionId))
          .flatMap(([, files]) => files);
    const uploadedMaterialFiles = await uploadMaterialAttachments();
    const keptMaterialAttachments = Object.entries(existingMaterialAttachments)
      .filter(([materialId]) => materialIds.has(materialId))
      .flatMap(([, files]) => files);
    const combined = [
      ...keptAttachments,
      ...keptCriterionAttachments,
      ...keptMaterialAttachments,
      ...uploaded,
      ...uploadedCriterionFiles,
      ...uploadedMaterialFiles,
    ];
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
    setMaterialFiles({});
    setExistingMaterialAttachments({});
    setSubmitError("");
    setFormData({
      reportType: isGeneralEvaluation ? PERFORMANCE_REPORT_LABEL : activeType?.label || "",
      reportCategory: "",
      reportNumber: "",
      title: isGeneralEvaluation ? GENERAL_EVALUATION_LABEL : "",
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
        const saved = (await response.json().catch(() => null)) as { reportNumber?: string } | null;
        setSubmittedNumber(saved?.reportNumber ?? formData.reportNumber ?? null);
        setSubmitted(true);
        window.scrollTo({ top: 0 });
      } else {
        setSubmitError("Илгээх үед алдаа гарлаа. Дахин оролдоно уу.");
        toast("Илгээх үед алдаа гарлаа.", "error");
      }
    } catch {
      setSubmitError("Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.");
      toast("Файл хуулах үед алдаа гарлаа.", "error");
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
        toast("Ноорог хадгалагдлаа.");
        router.push("/sender/drafts");
      } else {
        setSubmitError("Хадгалах үед алдаа гарлаа. Дахин оролдоно уу.");
        toast("Хадгалах үед алдаа гарлаа.", "error");
      }
    } catch {
      setSubmitError("Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.");
      toast("Файл хуулах үед алдаа гарлаа.", "error");
    } finally {
      setSavingDraft(false);
    }
  };

  return {
    isPerformanceReport,
    activeType,
    isEdit,
    isGeneralEvaluation,
    pageTitle,
    submitted,
    submittedNumber,
    submitting,
    savingDraft,
    attachedFiles,
    documentFiles,
    criteria,
    criterionFiles,
    submitError,
    existingAttachments,
    existingCriterionAttachments,
    materials,
    materialFiles,
    existingMaterialAttachments,
    initialLocation,
    formData,
    setLocation,
    handleChange,
    handleFileChange,
    handleDocumentChange,
    handleCriterionFilesChange,
    handleExistingCriterionFilesChange,
    handleMaterialFilesChange,
    handleExistingMaterialFilesChange,
    handleRemoveExistingAttachment,
    handleReset,
    handleBackToReports,
    handleSubmit,
    handleSaveDraft,
  };
}
