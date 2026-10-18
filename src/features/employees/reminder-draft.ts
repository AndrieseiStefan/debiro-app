export type EmployeeReminderDraft = {subject: string; message: string};
export type EmployeeReminderErrors = Partial<Record<keyof EmployeeReminderDraft, 'required' | 'subjectLength' | 'messageLength'>>;

/** Local composition only: subject is trimmed; intentional message whitespace/line breaks are retained. */
export function validateReminderDraft(input: EmployeeReminderDraft): {draft: EmployeeReminderDraft; errors: EmployeeReminderErrors} {
  const draft = {subject: input.subject.trim(), message: input.message}, errors: EmployeeReminderErrors = {};
  if (!draft.subject) errors.subject = 'required';
  else if (draft.subject.length > 150) errors.subject = 'subjectLength';
  if (!draft.message.trim()) errors.message = 'required';
  else if (draft.message.length > 5000) errors.message = 'messageLength';
  return {draft, errors};
}

/** Defensive warning only; existing Employee validation/read contracts remain strict. */
export function validReminderRecipient(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
