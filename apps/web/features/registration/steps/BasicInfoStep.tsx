import { ArrowLeft, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RegistrationFormValues } from '@/features/registration/types';

type BasicInfoStepProps = {
  values: RegistrationFormValues;
  onFieldChange: (
    field: Exclude<keyof RegistrationFormValues, 'studentId'>,
    value: string
  ) => void;
  onBack: () => void;
  onContinue: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

export function BasicInfoStep({
  values,
  onFieldChange,
  onBack,
  onContinue,
  isSubmitting = false,
  errorMessage,
}: BasicInfoStepProps) {
  return (
    <div className="flex h-full flex-col gap-5 sm:gap-6">
      <header className="space-y-2">
        <h3 className="landing-text-primary text-[1.22rem] leading-[1.15] font-semibold tracking-[-0.012em] sm:text-[1.35rem] sm:tracking-[-0.014em]">
          Basic Information
        </h3>
        <p className="landing-text-secondary text-[0.84rem] leading-[1.55] sm:text-[0.86rem]">
          Review your details before we begin the facial capture.
        </p>
        {errorMessage ? (
          <p
            role="alert"
            className="pt-0.5 text-[0.82rem] font-medium text-red-400"
          >
            {errorMessage}
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-5 rounded-[1rem] border border-white/[0.04] bg-white/[0.02] p-5 sm:gap-6 sm:p-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="basic-student-id"
            className="landing-form-label text-[0.82rem] sm:text-[0.85rem]"
          >
            Student ID
          </Label>
          <Input
            id="basic-student-id"
            value={values.studentId}
            readOnly
            className="landing-form-input landing-form-input-readonly w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="full-name"
            className="landing-form-label text-[0.82rem] sm:text-[0.85rem]"
          >
            Full Name
          </Label>
          <Input
            id="full-name"
            value={values.fullName}
            placeholder="Enter your full name"
            onChange={(event) => onFieldChange('fullName', event.target.value)}
            className="landing-form-input w-full"
            required
          />
        </div>

        <div className="col-span-1 flex flex-col gap-2 md:col-span-2">
          <Label
            htmlFor="phone-number"
            className="landing-form-label text-[0.82rem] sm:text-[0.85rem]"
          >
            Phone Number
          </Label>
          <Input
            id="phone-number"
            inputMode="tel"
            value={values.phoneNumber}
            placeholder="Enter your phone number"
            onChange={(event) =>
              onFieldChange('phoneNumber', event.target.value)
            }
            className="landing-form-input w-full"
            required
          />
        </div>

        <div className="col-span-1 flex flex-col gap-2 md:col-span-2">
          <Label
            htmlFor="university-email"
            className="landing-form-label text-[0.82rem] sm:text-[0.85rem]"
          >
            University Email
          </Label>
          <Input
            id="university-email"
            type="email"
            autoComplete="email"
            value={values.universityEmail}
            placeholder="Enter your university email"
            onChange={(event) =>
              onFieldChange('universityEmail', event.target.value)
            }
            className="landing-form-input w-full"
            required
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="landing-cta-outline group/back flex items-center justify-center gap-2 w-full sm:w-[35%] border-slate-300/80 bg-white/72 px-4 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-900/60"
        >
          <ArrowLeft className="size-4 opacity-70 transition-transform duration-200 group-hover/back:-translate-x-0.5" />
          <span>Back</span>
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={
            isSubmitting ||
            !values.fullName.trim() ||
            !values.phoneNumber.trim() ||
            !values.universityEmail.trim()
          }
          size="cta"
          className="w-full sm:w-[65%]"
        >
          <span>{isSubmitting ? 'Continuing...' : 'Continue'}</span>
          <ArrowRight className="size-4 opacity-90 transition-transform duration-200 group-hover/button:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
