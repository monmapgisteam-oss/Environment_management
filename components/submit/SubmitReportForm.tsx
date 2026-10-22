"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import ReportInfoCard from "@/components/submit/ReportInfoCard";
import LocationCard from "@/components/submit/LocationCard";
import AttachmentCard from "@/components/submit/AttachmentCard";
import DocumentUploadCard from "@/components/submit/DocumentUploadCard";
import EvidenceUploadCard from "@/components/submit/EvidenceUploadCard";
import SubmitSuccessCard from "@/components/submit/SubmitSuccessCard";
import SubmitFormHeader from "@/components/submit/SubmitFormHeader";
import AdditionalInfoFields from "@/components/submit/AdditionalInfoFields";
import SavedAttachmentList from "@/components/submit/SavedAttachmentList";
import SubmitActions from "@/components/submit/SubmitActions";
import SubmitStepper from "@/components/submit/SubmitStepper";
import { useReportSubmission } from "@/components/submit/useReportSubmission";
import { materialsTitle } from "@/lib/reports/materials";

// `register` is the sender company's РД. The server stores that company as the
// project implementer, so the form does not ask for it.
export default function SubmitReportForm({ register }: { register: string }) {
  const form = useReportSubmission();
  const showSavedAttachments = form.isEdit && form.existingAttachments.length > 0;
  const isStepForm = !form.isAdditional && !form.isGeneralEvaluation;
  const [currentStep, setCurrentStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const generalAttachments = (
    <div className="space-y-3">
      {showSavedAttachments && (
        <SavedAttachmentList
          attachments={form.existingAttachments}
          onRemove={form.handleRemoveExistingAttachment}
        />
      )}
      <AttachmentCard
        attachedFiles={form.attachedFiles}
        onFileChange={form.handleFileChange}
      />
    </div>
  );

  const materialsLabel = materialsTitle(form.formData.reportType);
  const materialUploads = (
    <EvidenceUploadCard
      title={materialsLabel}
      idPrefix="material"
      rows={form.materials.map((material) => ({
        id: material.id,
        label: material.label,
        detail: material.note,
      }))}
      filesByRow={form.materialFiles}
      existingByRow={form.existingMaterialAttachments}
      onFilesChange={form.handleMaterialFilesChange}
      onExistingChange={form.handleExistingMaterialFilesChange}
    />
  );

  const steps: { title: string; content: ReactNode }[] = [
    {
      title: "Тайлангийн мэдээлэл",
      content: (
        <ReportInfoCard
          formData={form.formData}
          handleChange={form.handleChange}
        />
      ),
    },
    {
      title: "Газарзүйн мэдээлэл",
      content: (
        <LocationCard
          onLocationChange={form.setLocation}
          initialLocation={form.initialLocation}
          register={register}
        />
      ),
    },
    // Performance reports: criterion evidence with general files under it,
    // then the materials of the chosen "Тайлангийн төрөл". Plans: the
    // documents of that "Тайлангийн төрөл" with general files under them.
    ...(form.isPerformanceReport
      ? [
          {
            title: "Үнэлгээний шалгуурын нотлох файл",
            content: (
              <>
                {form.criteria.length > 0 && (
                  <EvidenceUploadCard
                    title="Үнэлгээний шалгуурын нотлох файл"
                    description="Шалгуур бүрийн баруун талд зураг, PDF эсвэл Word файл хавсаргана уу."
                    idPrefix="criterion"
                    rows={form.criteria.map((criterion) => ({
                      id: criterion.id,
                      label: criterion.name,
                      detail: `Авбал зохих оноо: ${criterion.maxScore}`,
                    }))}
                    filesByRow={form.criterionFiles}
                    existingByRow={form.existingCriterionAttachments}
                    onFilesChange={form.handleCriterionFilesChange}
                    onExistingChange={form.handleExistingCriterionFilesChange}
                  />
                )}
                {generalAttachments}
              </>
            ),
          },
          { title: materialsLabel, content: materialUploads },
        ]
      : [
          {
            title: materialsLabel,
            content: (
              <>
                {form.materials.length > 0 && materialUploads}
                {generalAttachments}
              </>
            ),
          },
        ]),
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

  // Enter or "Дараах" moves on until the last step, which submits.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!isStepForm) return form.handleSubmit(event);
    event.preventDefault();
    if (!currentStepIsValid()) return;
    if (!isLastStep) {
      goToStep(activeStep + 1);
      return;
    }
    form.handleSubmit(event);
  };

  return (
    <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
      {/* Centered column so fields stay readable on wide screens */}
      <div className="mx-auto w-full max-w-5xl">
        {form.submitted ? (
          <SubmitSuccessCard
            isEdit={form.isEdit}
            isGeneralEvaluation={form.isGeneralEvaluation}
            onBackToReports={form.handleBackToReports}
            onReset={form.handleReset}
          />
        ) : (
          <div
            className="bg-white rounded-3xl"
            style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
          >
            {/* Card Header */}
            <SubmitFormHeader
              title={form.pageTitle}
              isAdditional={form.isAdditional}
              isGeneralEvaluation={form.isGeneralEvaluation}
            />

            {/* Card Body */}
            <form onSubmit={handleFormSubmit} noValidate={isStepForm} className="p-6 sm:p-8">
              {form.isAdditional ? (
                <AdditionalInfoFields
                  title={form.formData.title}
                  description={form.formData.description}
                  onChange={form.handleChange}
                />
              ) : form.isGeneralEvaluation ? (
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
                  <div className="mb-8 rounded-2xl bg-slate-50 px-2 py-5">
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

              {/* Action Buttons — Нэмэлт мэдээлэл has no submit action. */}
              {!form.isAdditional && (
                <SubmitActions
                  isGeneralEvaluation={form.isGeneralEvaluation}
                  submitting={form.submitting}
                  savingDraft={form.savingDraft}
                  onSaveDraft={form.handleSaveDraft}
                  isLastStep={isLastStep}
                  onBack={isStepForm && activeStep > 0 ? () => goToStep(activeStep - 1) : undefined}
                />
              )}
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
