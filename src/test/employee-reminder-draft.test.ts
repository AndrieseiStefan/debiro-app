import {describe, expect, it} from 'vitest';
import {validateReminderDraft, validReminderRecipient} from '@/features/employees/reminder-draft';

describe('Temporary employee reminder composition', () => {
  it('trims only the subject and retains intentional message line breaks and diacritics', () => {
    const message = '  Bună, Alexandra!\n\nInformații administrative — mulțumim.\n';
    expect(validateReminderDraft({subject: '  Informare  ', message})).toEqual({draft: {subject: 'Informare', message}, errors: {}});
  });
  it('rejects empty/whitespace fields and enforces the subject/message boundaries', () => {
    expect(validateReminderDraft({subject: ' \t ', message: '\n\r\t '}).errors).toEqual({subject: 'required', message: 'required'});
    expect(validateReminderDraft({subject: 's'.repeat(150), message: 'm'.repeat(5000)}).errors).toEqual({});
    expect(validateReminderDraft({subject: 's'.repeat(151), message: 'm'.repeat(5001)}).errors).toEqual({subject: 'subjectLength', message: 'messageLength'});
    expect(validateReminderDraft({subject: ` ${'s'.repeat(150)} `, message: 'valid'}).draft.subject).toHaveLength(150);
  });
  it('defensively identifies missing or malformed recipient emails without changing Employee validation', () => {
    for (const value of [undefined, null, 3, '', ' ', 'no-at', 'name@example', `${'a'.repeat(250)}@example.test`]) expect(validReminderRecipient(value)).toBe(false);
    expect(validReminderRecipient('alexandra@example.test')).toBe(true);
  });
});
