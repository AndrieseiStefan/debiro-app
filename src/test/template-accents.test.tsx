import {readFileSync} from 'node:fs';
import {render, screen, fireEvent} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {describe, expect, it, vi} from 'vitest';
import ro from '../../messages/ro.json';
import en from '../../messages/en.json';
import {assignTemplateAccents, nextTemplateAccent, resolveTemplateSources, templateAccentStyle, templateAccentTokens, validTemplateAccent} from '@/features/requirements/template-accents';
import {AppliedTemplateChip, TemplateSourceLabels} from '@/features/requirements/TemplateSources';
import {addRequirementDocument, getRequirementsWorkspace, readRequirementsState, saveExistingRequirementEdit, saveRequirementDraft, selectRequirementTemplate, startRequirementDraft, updateExistingRequirementTemplate, updateRequirementDraft} from '@/features/requirements/requirements-state';

const workspace = (id: string) => getRequirementsWorkspace(readRequirementsState(), id);
describe('company-owned automatic template accent identity', () => {
  it('uses unused families then deterministic extended shades, without a template limit', () => {
    const assigned: {id: string; accentToken: ReturnType<typeof nextTemplateAccent>}[] = [];
    for (let index = 0; index < 80; index++) assigned.push({id: String(index), accentToken: nextTemplateAccent(assigned)});
    expect(new Set(assigned.slice(0, 8).map((item) => item.accentToken)).size).toBe(8);
    expect(new Set(assigned.slice(0, 24).map((item) => item.accentToken)).size).toBe(24);
    expect(assigned.every((item) => validTemplateAccent(item.accentToken))).toBe(true);
    expect(assignTemplateAccents(assigned.toReversed()).toReversed()).toEqual(assigned);
    expect(assignTemplateAccents(assigned.slice(1))).toEqual(assigned.slice(1));
  });

  it('backfills legacy/invalid metadata deterministically without mutating input or overwriting valid assignments', () => {
    const records = [{id: 'z'}, {id: 'b', accentToken: 'bad'}, {id: 'a', accentToken: 'green'}], original = structuredClone(records);
    const assigned = assignTemplateAccents(records);
    expect(records).toEqual(original);
    expect(assigned[2].accentToken).toBe('green');
    expect(assignTemplateAccents(records.toReversed()).toReversed()).toEqual(assigned);
    expect(assignTemplateAccents(assigned)).toEqual(assigned);
    expect(templateAccentStyle('bad')).toBeUndefined();
  });

  it('persists automatic identity through edits, unrelated creation/deletion/reordering, and module navigation', async () => {
    const companyId = 'unit-template-accent-lifecycle';
    startRequirementDraft(companyId, 'company'); updateRequirementDraft(companyId, {name: 'First template'});
    addRequirementDocument(companyId, {catalogDocumentTypeId: 'tax', required: true, expiryWarningDays: 30, validityMonths: 12});
    expect(saveRequirementDraft(companyId)).toBe('saved');
    const first = workspace(companyId).templates[0];
    selectRequirementTemplate(companyId, first.id); updateExistingRequirementTemplate(companyId, 'en', {name: 'Renamed template', iconColorKey: 'rose'});
    expect(saveExistingRequirementEdit(companyId)).toBe('saved');
    expect(workspace(companyId).templates[0].accentToken).toBe(first.accentToken);
    const legacy = {...first, id: 'legacy-color', title: {ro: 'Legacy', en: 'Legacy'}};
    Reflect.deleteProperty(legacy, 'accentToken');
    readRequirementsState().byCompany[companyId].templates.push(legacy);
    const before = structuredClone(legacy);
    vi.resetModules(); const reloaded = await import('@/features/requirements/requirements-state');
    const saved = reloaded.readRequirementsState().byCompany[companyId].templates;
    expect(saved[0].accentToken).toBe(first.accentToken);
    const {accentToken, ...rest} = saved[1]; expect(validTemplateAccent(accentToken)).toBe(true); expect(rest).toEqual(before);
    expect(accentToken).not.toBe(first.accentToken);
    expect(reloaded.getRequirementsWorkspace(reloaded.readRequirementsState(), 'different-company').templates).toEqual([]);
  });

  it('resolves only explicit owned/scope-valid links, preserving snapshot names and persisted association order', () => {
    const templates = workspace('demo-company').templates;
    const [first, second] = templates;
    const snapshots = {[first.id]: {ro: 'Nume la aplicare', en: 'Name when applied'}};
    const sources = resolveTemplateSources(templates.toReversed(), 'demo-company', 'vendor', [second.id, 'deleted', first.id, first.id], snapshots);
    expect(sources.map((item) => item.templateId)).toEqual([second.id, first.id]);
    expect(sources[1].name).toEqual(snapshots[first.id]);
    expect(resolveTemplateSources(templates, 'other-company', 'vendor', [first.id])).toEqual([]);
    expect(resolveTemplateSources(templates, 'demo-company', 'company', [first.id])).toEqual([]);
    expect(resolveTemplateSources(templates, 'demo-company', 'vendor', {length: 1})).toEqual([]);
    expect(resolveTemplateSources(templates, 'demo-company', 'vendor', [null, {}, 'deleted'])).toEqual([]);
    expect(resolveTemplateSources(templates, 'demo-company', 'vendor', [])).toEqual([]);
  });

  it('maintains AA contrast for every source ink on all badge shades and row tints', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8');
    const hex = (key: string): string => {
      const value = css.match(new RegExp(`--${key}: ([^;]+);`))![1];
      return value.startsWith('var(') ? hex(value.slice(6, -1)) : value;
    };
    const rgb = (color: string) => [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
    const luminance = (values: number[]) => values.map((value) => {const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    for (const token of templateAccentTokens) {
      const family = token.split('-')[0], ink = luminance(rgb(hex(`template-ink-${family}`))), accent = rgb(hex(`template-accent-${family}`));
      for (const weight of [.04, .06, .08, .10, .16, .23]) {
        const background = luminance(accent.map((value) => value * weight + 255 * (1 - weight)));
        expect((background + .05) / (ink + .05), token).toBeGreaterThanOrEqual(4.5);
        expect((background + .05) / (luminance(rgb(hex('color-text-secondary'))) + .05), `${token} neutral metadata`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect((luminance(rgb(hex('color-neutral-soft'))) + .05) / (luminance(rgb(hex('color-text-secondary'))) + .05)).toBeGreaterThanOrEqual(4.5);
  });
});

for (const locale of ['ro', 'en'] as const) describe(`${locale} shared template source presentation`, () => {
  const messages = locale === 'ro' ? ro : en;
  it('shows all source labels, neutral manual/unavailable states, and the same removable chip', () => {
    const sources = resolveTemplateSources(workspace('demo-company').templates, 'demo-company', 'vendor', ['construction', 'maintenance']);
    const remove = vi.fn();
    render(<NextIntlClientProvider locale={locale} messages={messages}><TemplateSourceLabels sources={sources} hasTemplateSource locale={locale}/>
      <TemplateSourceLabels sources={[]} hasTemplateSource={false} locale={locale}/><TemplateSourceLabels sources={[]} hasTemplateSource locale={locale}/>
      <AppliedTemplateChip name="Applied template" accentToken={sources[0].accentToken} onRemove={remove}/></NextIntlClientProvider>);
    expect(screen.getByText(messages.VendorTemplates.templateSource.replace('{name}', sources[0].name[locale]))).toHaveAttribute('data-template-accent', sources[0].accentToken);
    expect(screen.getByText(messages.VendorTemplates.manualSource)).not.toHaveAttribute('data-template-accent');
    expect(screen.getByText(messages.VendorTemplates.sourceUnavailable)).not.toHaveAttribute('data-template-accent');
    fireEvent.click(screen.getByRole('button', {name: messages.VendorTemplates.removeAssociation.replace('{name}', 'Applied template')})); expect(remove).toHaveBeenCalledOnce();
  });
});
