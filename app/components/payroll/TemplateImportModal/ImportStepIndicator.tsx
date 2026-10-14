import { CheckCircle2 } from 'lucide-react';
import type { ImportStep } from './useTemplateImport';

export function ImportStepIndicator({ currentStep }: { currentStep: ImportStep }) {
  return (
    <div className="p-6 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {[
          { key: 'upload', label: 'Upload' },
          { key: 'review', label: 'Review' },
          { key: 'mapping', label: 'Map Fields' },
          { key: 'preview', label: 'Preview' },
        ].map((step, index, arr) => (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep === step.key
                    ? 'bg-red-600 text-white'
                    : arr.findIndex((s) => s.key === currentStep) > index
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}
              >
                {arr.findIndex((s) => s.key === currentStep) > index ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">{step.label}</span>
            </div>
            {index < arr.length - 1 && <div className="flex-1 h-0.5 bg-gray-300 mx-4" />}
          </div>
        ))}
      </div>
    </div>
  );
}
