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
      <header className="space-y-1.5">
        <h2 className="landing-text-primary text-[1.22rem] font-semibold tracking-tight sm:text-[1.35rem]">
          Basic Information
        </h2>
        <p className="landing-text-secondary text-[0.84rem] leading-[1.55] sm:text-[0.86rem]">
          Confirm your profile details before starting identity verification.
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

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 sm:gap-[1.1rem] sm:p-[1.1rem] md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="basic-student-id"
            className="landing-form-label text-[0.8rem] font-semibold sm:text-[0.82rem]"
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

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="full-name"
            className="landing-form-label text-[0.8rem] font-semibold sm:text-[0.82rem]"
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

        <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2">
          <Label
            htmlFor="phone-number"
            className="landing-form-label text-[0.8rem] font-semibold sm:text-[0.82rem]"
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

        <div className="col-span-1 flex flex-col gap-1.5 md:col-span-2">
          <Label
            htmlFor="university-email"
            className="landing-form-label text-[0.8rem] font-semibold sm:text-[0.82rem]"
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

      <div className="mt-auto flex flex-col gap-3 pt-1 sm:flex-row sm:gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="landing-cta-outline w-full sm:w-1/3 border-slate-300/80 bg-white/72 px-4 text-slate-700 hover:bg-slate-100 dark:border-white/12 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900/85"
        >
          <ArrowLeft className="size-4" />
          Back
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
          className="landing-button-bg landing-cta w-full sm:w-2/3 gap-2 px-5 text-white"
        >
          {isSubmitting ? 'Continuing...' : 'Continue'}
          <ArrowRight className="size-4 transition-transform duration-150 group-hover/button:translate-x-0.5" />
        </Button>
      </div>
    </div>
  );
}
