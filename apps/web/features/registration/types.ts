export type RegistrationStepId =
  | 'student-id'
  | 'basic-info'
  | 'face-prep'
  | 'success';

export type RegistrationFormValues = {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  universityEmail: string;
};

export type RegistrationStepMeta = {
  id: RegistrationStepId;
  label: string;
  title: string;
};

export type RegistrationFlowProps = {
  className?: string;
  onStepIndexChange?: (index: number) => void;
  onDone?: () => void;
};

/**
 * State machine for upfront student ID validation in Step 1.
 * The step can only advance when status === 'valid'.
 */
export type StudentIdValidationState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid' }
  | { status: 'invalid'; reason: string };
