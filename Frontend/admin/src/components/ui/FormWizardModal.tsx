import React, { useRef } from "react";
import { FaCheck, FaTimes, FaArrowLeft, FaArrowRight, FaChevronRight } from "react-icons/fa";

interface FormWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps?: number;
  stepTitles: string[];
  onNext: () => boolean | Promise<boolean>;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onStepClick?: (step: number) => void;
  isSubmitting?: boolean;
  submitText?: string;
  isViewOnly?: boolean;
  children: React.ReactNode;
}

export const FormWizardModal: React.FC<FormWizardModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  currentStep,
  totalSteps = 2,
  stepTitles,
  onNext,
  onBack,
  onSubmit,
  onStepClick,
  isSubmitting = false,
  submitText = "Hoàn tất",
  isViewOnly = false,
  children,
}) => {
  const lastStepTransitionTime = useRef<number>(0);

  if (!isOpen) return null;

  const handleNext = async () => {
    console.log("[FormWizardModal] handleNext triggered, currentStep:", currentStep, "totalSteps:", totalSteps);
    lastStepTransitionTime.current = Date.now();
    const isValid = await onNext();
    console.log("[FormWizardModal] onNext result:", isValid);
    if (!isValid) return;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700 transition-all transform my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {isViewOnly ? (
          <div className="flex border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            {stepTitles.map((stepTitle, idx) => {
              const stepNumber = idx + 1;
              const isActive = currentStep === stepNumber;
              return (
                <button
                  key={stepNumber}
                  type="button"
                  onClick={() => {
                    if (onStepClick) onStepClick(stepNumber);
                  }}
                  className={`flex-1 py-4 text-center text-sm font-semibold transition-colors border-b-2 ${
                    isActive
                      ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {stepTitle}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
            {stepTitles.map((stepTitle, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = currentStep > stepNumber;
              const isActive = currentStep === stepNumber;

              return (
                <React.Fragment key={stepNumber}>
                  <div
                    onClick={() => {
                      if (onStepClick) {
                        onStepClick(stepNumber);
                      }
                    }}
                    className={`flex items-center gap-3 ${
                      onStepClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        isCompleted
                          ? "bg-green-600 text-white shadow-md shadow-green-600/20"
                          : isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-4 ring-blue-100 dark:ring-blue-900/50"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {isCompleted ? <FaCheck className="h-4 w-4" /> : stepNumber}
                    </div>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-blue-600 dark:text-blue-400" : isCompleted ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-400"}`}>
                        Bước {stepNumber}
                      </p>
                      <p className={`text-sm font-semibold ${isActive ? "text-gray-900 dark:text-white font-bold" : "text-gray-600 dark:text-gray-300"}`}>
                        {stepTitle}
                      </p>
                    </div>
                  </div>

                  {idx < stepTitles.length - 1 && (
                    <div className="flex-1 mx-4 flex items-center justify-center relative">
                      <div className={`w-full h-0.5 rounded-full transition-colors ${currentStep > idx + 1 ? "bg-green-600 dark:bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                      <div className={`absolute flex items-center justify-center rounded-full h-6 w-6 border transition-all ${
                        currentStep > idx + 1
                          ? "bg-green-600 border-green-600 text-white shadow-xs"
                          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-400"
                      }`}>
                        <FaChevronRight className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isViewOnly) return;
            const elapsed = Date.now() - lastStepTransitionTime.current;
            console.log("[FormWizardModal] form onSubmit event fired! elapsed since last step transition:", elapsed, "ms", "currentStep:", currentStep, "totalSteps:", totalSteps);
            if (elapsed < 500) {
              console.log("[FormWizardModal] SUBMIT BLOCKED! Step transition happened less than 500ms ago.");
              return;
            }
            if (currentStep < totalSteps) {
              console.log("[FormWizardModal] currentStep < totalSteps -> calling handleNext()");
              handleNext();
            } else {
              console.log("[FormWizardModal] currentStep === totalSteps -> calling onSubmit(e)");
              onSubmit(e);
            }
          }}
          className="flex flex-col"
        >
          <div className="max-h-[65vh] overflow-y-auto px-6 py-6 custom-scrollbar">
            {children}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-b-2xl">
            {isViewOnly ? (
              <div className="flex justify-end w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div>
                  {currentStep > 1 ? (
                    <button
                      key={`btn-back-step-${currentStep}`}
                      type="button"
                      onClick={onBack}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <FaArrowLeft className="h-3.5 w-3.5" />
                      Quay lại
                    </button>
                  ) : (
                    <button
                      key={`btn-cancel-step-${currentStep}`}
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      Hủy
                    </button>
                  )}
                </div>

                <div>
                  {currentStep < totalSteps ? (
                    <button
                      key={`btn-next-step-${currentStep}`}
                      type="button"
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                    >
                      Tiếp theo
                      <FaArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      key={`btn-submit-step-${currentStep}`}
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-600/20 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <FaCheck className="h-3.5 w-3.5" />
                          {submitText}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormWizardModal;
