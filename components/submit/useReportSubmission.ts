import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isDocumentAttachment, isReportAttachment, parseAttachments, type Attachment } from "@/lib/reports/attachments";
import { materialsFor, type ReportMaterial } from "@/lib/reports/materials";
import { formWordForReportType, PERFORMANCE_TYPE_SLUG, PLAN_TYPE_SLUG, reportKind } from "@/lib/reports/terms";
import { parseRevisionItems, type RevisionItem } from "@/lib/reports/revisions";
import { toast } from "@/lib/toast";
import { uploadErrorMessage, uploadReportFile } from "@/lib/reports/uploadFile";

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
  status?: string | null;
  returnReason?: string | null;
  revisionItems?: string | null;
  title?: string | null;
  reportType?: { name?: string | null; slug?: string | null } | null;
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
async function uploadFile(file: File, purpose: string): Promise<UploadedFile> {
  return uploadReportFile(file, purpose);
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

  const [submitted, setSubmitted] = useState(false);
  // Number the server assigned to the report that was just sent.
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState("");
  // Attachments already saved on the report being edited (kept unless removed).
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [existingCriterionAttachments, setExistingCriterionAttachments] = useState<Record<string, Attachment[]>>({});
  const [materialFiles, setMaterialFiles] = useState<Record<string, File[]>>({});
  const [existingMaterialAttachments, setExistingMaterialAttachments] = useState<Record<string, Attachment[]>>({});
  const [initialLocation, setInitialLocation] = useState<SubmitLocation | null>(null);
  const [location, setLocation] = useState<SubmitLocation | null>(null);
  // Status of the report being edited, and why it was returned (if it was).
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [returnInfo, setReturnInfo] = useState<{ reason: string | null; items: RevisionItem[] } | null>(null);
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
  // Plans and performance reports attach the document and its "Хавсралт"
  // (lib/reports/materials.ts); the general evaluation attaches documents only.
  const word = formWordForReportType(formData.reportType);
  const pageTitle = isEdit ? `${word.capital} засах` : activeType?.label || `${word.capital} илгээх`;
  const listedMaterials = isGeneralEvaluation ? [] : materialsFor(formData.reportType, formData.reportCategory);
  // Files a saved report keeps under rows of an older document list get their
  // own rows, so the sender can see and remove them.
  const listedIds = new Set(listedMaterials.map((material) => material.id));
  const leftoverMaterials: ReportMaterial[] = Object.entries(existingMaterialAttachments)
    .filter(([id, files]) => !listedIds.has(id) && files.length > 0)
    .map(([id], index) => ({ id, label: `Өмнөх хавсралт ${index + 1}` }));
  const materials = [...listedMaterials, ...leftoverMaterials];
  const materialIds = new Set(materials.map((material) => material.id));

  useEffect(() => {
    if (typeSlug === "general-evaluation") {
      router.replace("/sender/submit");
    }
  }, [router, typeSlug]);

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
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSubmitError(body?.error || "Тайланг ачаалж чадсангүй. Хуудсыг дахин ачаална уу.");
        return;
      }
      const r = (await res.json()) as EditableReport;
      setEditStatus(r.status || null);
      if (r.status === "needs_revision") {
        setReturnInfo({ reason: r.returnReason || null, items: parseRevisionItems(r.revisionItems) });
      }
      const savedAttachments = parseAttachments(r.fileUrl);
      const isSavedGeneralEvaluation = r.title === GENERAL_EVALUATION_LABEL;
      if (isSavedGeneralEvaluation) {
        router.replace("/sender/reports");
        return;
      }
      setEditSubmitType(null);
      setFormData({
        // The form works with its own labels; the saved type is read by slug,
        // so a type the admin renamed still opens as a plan or report.
        reportType:
          reportKind(r.reportType) === "plan"
            ? SUBMIT_TYPES[0].label
            : reportKind(r.reportType) === "performance"
            ? PERFORMANCE_REPORT_LABEL
            : r.reportType?.name || "",
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

  const handleDocumentChange = (files: File[]) => {
    setDocumentFiles(files);
    setSubmitError("");
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

  // Only the current category's materials are kept, in case the sender switched
  // "Төслийн ангилал" after picking files.
  const uploadMaterialAttachments = async () => {
    const uploaded: Attachment[] = [];
    for (const [materialId, files] of Object.entries(materialFiles)) {
      if (!materialIds.has(materialId)) continue;
      for (const file of files) {
        const data = await uploadFile(file, "report-attachment");
        uploaded.push({ url: data.url, name: data.name, materialId });
      }
    }
    return uploaded;
  };

  const uploadDocuments = async () => {
    const uploaded: UploadedFile[] = [];
    for (const file of documentFiles) {
      uploaded.push(await uploadFile(file, "report-document"));
    }
    return uploaded;
  };

  // Combine the kept existing attachments with any newly uploaded files into the
  // JSON string stored on the report. Preserves the sender's original files when
  // editing, while letting them add more.
  const buildFileUrl = async () => {
    const uploaded = isGeneralEvaluation ? await uploadDocuments() : [];
    const keptAttachments = existingAttachments.filter(
      isGeneralEvaluation ? isDocumentAttachment : isReportAttachment,
    );
    // The form no longer asks for evidence per criterion; evidence saved on
    // older reports is kept.
    const keptCriterionAttachments = isGeneralEvaluation ? [] : Object.values(existingCriterionAttachments).flat();
    const uploadedMaterialFiles = await uploadMaterialAttachments();
    const keptMaterialAttachments = Object.entries(existingMaterialAttachments)
      .filter(([materialId]) => materialIds.has(materialId))
      .flatMap(([, files]) => files);
    const combined = [
      ...keptAttachments,
      ...keptCriterionAttachments,
      ...keptMaterialAttachments,
      ...uploaded,
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
        reportTypeSlug:
          !isGeneralEvaluation && reportKind(formData.reportType) === "plan" ? PLAN_TYPE_SLUG : PERFORMANCE_TYPE_SLUG,
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
        // Show the server's reason (e.g. a refused file) when it gives one.
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(body?.error || "Илгээх үед алдаа гарлаа. Дахин оролдоно уу.");
        toast(body?.error || "Илгээх үед алдаа гарлаа.", "error");
      }
    } catch (error) {
      setSubmitError(uploadErrorMessage(error));
      toast(uploadErrorMessage(error), "error");
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
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setSubmitError(body?.error || "Хадгалах үед алдаа гарлаа. Дахин оролдоно уу.");
        toast(body?.error || "Хадгалах үед алдаа гарлаа.", "error");
      }
    } catch (error) {
      setSubmitError(uploadErrorMessage(error));
      toast(uploadErrorMessage(error), "error");
    } finally {
      setSavingDraft(false);
    }
  };

  return {
    activeType,
    isEdit,
    isGeneralEvaluation,
    pageTitle,
    word,
    location,
    setSubmitError,
    editStatus,
    returnInfo,
    submitted,
    submittedNumber,
    submitting,
    savingDraft,
    documentFiles,
    submitError,
    existingAttachments,
    materials,
    materialFiles,
    existingMaterialAttachments,
    initialLocation,
    formData,
    setLocation,
    handleChange,
    handleDocumentChange,
    handleMaterialFilesChange,
    handleExistingMaterialFilesChange,
    handleRemoveExistingAttachment,
    handleBackToReports,
    handleSubmit,
    handleSaveDraft,
  };
}
