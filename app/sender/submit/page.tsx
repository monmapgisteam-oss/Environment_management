"use client";

import ReportInfoCard from "@/components/submit/ReportInfoCard";
import LocationCard from "@/components/submit/LocationCard";
import AttachmentCard from "@/components/submit/AttachmentCard";
import DocumentUploadCard from "@/components/submit/DocumentUploadCard";
import CriterionEvidenceUploadCard from "@/components/submit/CriterionEvidenceUploadCard";
import SubmitSuccessCard from "@/components/submit/SubmitSuccessCard";
import SubmitFormHeader from "@/components/submit/SubmitFormHeader";
import AdditionalInfoFields from "@/components/submit/AdditionalInfoFields";
import SavedAttachmentList from "@/components/submit/SavedAttachmentList";
import SubmitActions from "@/components/submit/SubmitActions";
import { useReportSubmission } from "@/components/submit/useReportSubmission";

export default function SubmitReportPage() {
  const form = useReportSubmission();
  const showSavedAttachments = form.isEdit && form.existingAttachments.length > 0;

  return (
    <main className="flex-1 min-w-0 p-6">
      {form.submitted ? (
        <SubmitSuccessCard
          isEdit={form.isEdit}
          isGeneralEvaluation={form.isGeneralEvaluation}
          onBackToReports={form.handleBackToReports}
          onReset={form.handleReset}
        />
      ) : (
        <div
          className="bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
        >
          {/* Card Header */}
          <SubmitFormHeader
            title={form.pageTitle}
            isAdditional={form.isAdditional}
            isGeneralEvaluation={form.isGeneralEvaluation}
          />

          {/* Card Body */}
          <form onSubmit={form.handleSubmit} className="p-10">
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
                <div className="grid grid-cols-3 gap-8">
                  {/* Left: Report Info */}
                  <div className="col-span-2">
                    <ReportInfoCard
                      formData={form.formData}
                      handleChange={form.handleChange}
                    />
                  </div>
                  {/* Right: Attachment */}
                  <div className="col-span-1 space-y-3">
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
                </div>

                {/* Location */}
                <div className="mt-8">
                  <LocationCard
                    onLocationChange={form.setLocation}
                    initialLocation={form.initialLocation}
                    register={form.formData.implementerRegister}
                  />
                </div>

                {form.criteria.length > 0 && (
                  <div className="mt-8">
                    <CriterionEvidenceUploadCard
                      criteria={form.criteria}
                      filesByCriterion={form.criterionFiles}
                      existingByCriterion={form.existingCriterionAttachments}
                      onFilesChange={form.handleCriterionFilesChange}
                      onExistingChange={form.handleExistingCriterionFilesChange}
                    />
                  </div>
                )}
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
              />
            )}
          </form>
        </div>
      )}
    </main>
  );
}
