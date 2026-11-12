"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import ReportInfoCard from "@/components/submit/ReportInfoCard";
import LocationCard from "@/components/submit/LocationCard";
import DocumentUploadCard from "@/components/submit/DocumentUploadCard";
import EvidenceUploadCard from "@/components/submit/EvidenceUploadCard";
import SubmitSuccessCard from "@/components/submit/SubmitSuccessCard";
import SubmitFormHeader from "@/components/submit/SubmitFormHeader";
import SavedAttachmentList from "@/components/submit/SavedAttachmentList";
import SubmitActions from "@/components/submit/SubmitActions";
import SubmitStepper from "@/components/submit/SubmitStepper";
import { useReportSubmission } from "@/components/submit/useReportSubmission";
import RevisionNotice from "@/components/reports/detail/RevisionNotice";
import { ANNEX, MAIN_DOCUMENT_ID, REQUIRED_ANNEX_MATERIALS, materialsTitle, type ReportMaterial } from "@shared/reports/materials";
import { nounForReportType } from "@shared/reports/terms";

// "Шинэ ... илгээх" after a send starts a fresh form: remounting resets every
// step, picked file and the map pin at once.
export default function SubmitReportForm() {
  const [formKey, setFormKey] = useState(0);
  return <SubmitReportFormBody key={formKey} onNew={() => setFormKey((key) => key + 1)} />;
}

// The server stores the sender company as the project implementer, so the
// form does not ask for it.
function SubmitReportFormBody({ onNew }: { onNew: () => void }) {
  const form = useReportSubmission();
  const showSavedAttachments = form.isEdit && form.existingAttachments.length > 0;
  const isStepForm = !form.isGeneralEvaluation;
  const [currentStep, setCurrentStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // General files saved on older reports, which the form no longer asks for,
  // stay listed so the sender can remove them.
  const savedGeneralAttachments = showSavedAttachments && (
    <SavedAttachmentList attachments={form.existingAttachments} onRemove={form.handleRemoveExistingAttachment} />
  );

  const materialsLabel = materialsTitle(form.formData.reportType);
  const materialCard = (
    materials: ReportMaterial[],
    props: { title: string; idPrefix: string; headerLink?: { href: string; label: string } },
  ) => (
    <EvidenceUploadCard
      {...props}
      rows={materials.filter((material) => !REQUIRED_ANNEX_MATERIALS.some((annex) => annex.id === material.id)).map((material) => ({
        id: material.id,
        label: material.label,
        detail: material.note,
        required: material.id === MAIN_DOCUMENT_ID,
        ...(material.id === ANNEX.id ? {
          detail: "Дараах гурван баримт бичгийг PDF файлаар заавал хавсаргана уу.",
          uploadRows: [
            ...REQUIRED_ANNEX_MATERIALS.map((annex) => ({ ...annex, required: true })),
            { id: ANNEX.id, label: "Бусад хавсралт" },
          ],
        } : {}),
      }))}
      filesByRow={form.materialFiles}
      existingByRow={form.existingMaterialAttachments}
      onFilesChange={form.handleMaterialFilesChange}
      onExistingChange={form.handleExistingMaterialFilesChange}
    />
  );
  // Required annex uploads share the "Хавсралт" box.
  const materialUploads = materialCard(form.materials, { title: materialsLabel, idPrefix: "material" });

  const steps: { title: string; content: ReactNode }[] = [
    {
      title: `${form.word.of} мэдээлэл`,
      content: (
        <ReportInfoCard
          formData={form.formData}
          handleChange={form.handleChange}
          word={form.word}
        />
      ),
    },
    {
      title: "Газарзүйн мэдээлэл",
      content: (
        <LocationCard
          onLocationChange={form.setLocation}
          initialLocation={form.initialLocation}
        />
      ),
    },
    // Plans and performance reports alike: the document and its "Хавсралт".
    {
      title: materialsLabel,
      content: (
        <>
          {form.materials.length > 0 && materialUploads}
          {savedGeneralAttachments}
        </>
      ),
    },
  ];
  const stepTitles = steps.map((step) => step.title);
  const lastStep = steps.length - 1;
  // The step list changes with the report type, so stay in range.
  const activeStep = Math.min(currentStep, lastStep);
  const isLastStep = !isStepForm || activeStep >= lastStep;

  // Checks the visible step's required fields and shows the browser's message
  // on the first one that is missing.
  const currentStepIsValid = () => {
    const container = stepRefs.current[activeStep];
    if (!container) return true;
    const fields = container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea",
    );
    return Array.from(fields).every((field) => field.reportValidity());
  };

  const goToStep = (index: number) => {
    setCurrentStep(Math.max(0, Math.min(index, lastStep)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Switching between plan and performance in the sidebar keeps this page
  // mounted, so start that form from its first step.
  const reportType = form.formData.reportType;
  useEffect(() => {
    setCurrentStep(0);
  }, [reportType]);

  // A step that was hidden needs a resize so the Leaflet map redraws.
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [activeStep]);

  // Before sending, every step is checked, not just the visible one: the
  // first step with something missing opens with the browser's message, and
  // the map pin and main document are checked too.
  const firstInvalidStep = () =>
    stepRefs.current.findIndex((container) =>
      Array.from(
        container?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? [],
      ).some((field) => !field.checkValidity()),
    );
  const hasMainDocument =
    (form.materialFiles[MAIN_DOCUMENT_ID]?.length ?? 0) + (form.existingMaterialAttachments[MAIN_DOCUMENT_ID]?.length ?? 0) > 0;
  // Reports filed under the older document lists have no main document row.
  const isLegacyReturn =
    form.editStatus === "needs_revision" &&
    !form.existingMaterialAttachments[MAIN_DOCUMENT_ID]?.length &&
    Object.keys(form.existingMaterialAttachments).length > 0;

  const readyToSend = () => {
    const invalid = firstInvalidStep();
    if (invalid >= 0) {
      goToStep(invalid);
      setTimeout(() => currentStepFields(invalid).find((field) => !field.checkValidity())?.reportValidity(), 50);
      return false;
    }
    if (form.location?.lat == null || form.location?.lng == null) {
      goToStep(1);
      form.setSubmitError("Газрын зураг дээр байршлаа сонгоно уу.");
      return false;
    }
    if (!hasMainDocument && !isLegacyReturn) {
      goToStep(lastStep);
      form.setSubmitError("Үндсэн баримт бичгээ (PDF) хавсаргана уу.");
      return false;
    }
    const missingAnnex = REQUIRED_ANNEX_MATERIALS.find((material) =>
      !(form.materialFiles[material.id]?.length || form.existingMaterialAttachments[material.id]?.length),
    );
    if (missingAnnex) {
      goToStep(lastStep);
      form.setSubmitError(`«${missingAnnex.label}» баримт бичгийг (PDF) хавсаргана уу.`);
      return false;
    }
    return true;
  };
  const currentStepFields = (index: number) =>
    Array.from(
      stepRefs.current[index]?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea") ?? [],
    );

  // Enter or "Дараах" moves on until the last step, which submits.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!isStepForm) return form.handleSubmit(event);
    event.preventDefault();
    if (!currentStepIsValid()) return;
    if (!isLastStep) {
      goToStep(activeStep + 1);
      return;
    }
    if (!readyToSend()) return;
    form.handleSubmit(event);
  };

  return (
    <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      {/* Centered column so fields stay readable on wide screens */}
      <div className="mx-auto w-full max-w-5xl">
        {form.submitted ? (
          <SubmitSuccessCard
            noun={nounForReportType(form.formData.reportType)}
            // Sending a saved draft is a first send; only a returned report is "re"-sent.
            isEdit={form.isEdit && form.editStatus === "needs_revision"}
            isGeneralEvaluation={form.isGeneralEvaluation}
            reportNumber={form.submittedNumber}
            onBackToReports={form.handleBackToReports}
            onReset={onNew}
          />
        ) : (
          <div
            className="bg-white"
            style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
          >
            {/* Card Header */}
            <SubmitFormHeader
              title={form.pageTitle}
              isGeneralEvaluation={form.isGeneralEvaluation}
              word={form.word}
            />

            {/* Card Body */}
            <form onSubmit={handleFormSubmit} noValidate={isStepForm} className="p-6 sm:p-8">
              {/* Fixing a returned report: why it came back, above the form. */}
              {form.returnInfo && (form.returnInfo.reason || form.returnInfo.items.length > 0) && (
                <div className="mb-6">
                  <RevisionNotice reason={form.returnInfo.reason} items={form.returnInfo.items} />
                </div>
              )}
              {form.isGeneralEvaluation ? (
                <div className="max-w-3xl">
                  {showSavedAttachments && (
                    <SavedAttachmentList
                      className="mb-4"
                      attachments={form.existingAttachments}
                      onRemove={form.handleRemoveExistingAttachment}
                    />
                  )}
                  <DocumentUploadCard
                    attachedFiles={form.documentFiles}
                    onFileChange={form.handleDocumentChange}
                  />
                  {form.submitError && (
                    <p className="mt-3 text-sm font-medium text-red-500">{form.submitError}</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-8 bg-slate-50 px-2 py-5">
                    <SubmitStepper steps={stepTitles} currentStep={activeStep} onStepClick={goToStep} />
                  </div>
                  {/* Every step stays mounted so the map and picked files keep their state. */}
                  {steps.map((step, index) => (
                    <div
                      key={step.title}
                      ref={(element) => {
                        stepRefs.current[index] = element;
                      }}
                      className={index === activeStep ? "space-y-8" : "hidden"}
                    >
                      {step.content}
                    </div>
                  ))}
                </>
              )}

              {form.submitError && !form.isGeneralEvaluation && (
                <p className="mt-4 text-sm font-medium text-red-500">{form.submitError}</p>
              )}

              <SubmitActions
                isGeneralEvaluation={form.isGeneralEvaluation}
                word={form.word.capital}
                submitting={form.submitting}
                savingDraft={form.savingDraft}
                onSaveDraft={form.handleSaveDraft}
                // A returned report is fixed and sent, never saved back to drafts.
                canSaveDraft={form.editStatus !== "needs_revision"}
                isLastStep={isLastStep}
                onBack={isStepForm && activeStep > 0 ? () => goToStep(activeStep - 1) : undefined}
              />
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
