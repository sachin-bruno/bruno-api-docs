import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useRenderToDom } from '@/hooks/useRenderToDom';
import { getByTestId, query, queryByTestId } from '@/test-utils/dom';
import { PromptVariablesModal } from './PromptVariablesModal';

vi.mock('@/ui/Portal/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children
}));

const dialogTree = (props: Partial<React.ComponentProps<typeof PromptVariablesModal>> = {}) => (
  <PromptVariablesModal
    open
    names={['OTP']}
    onSubmit={() => {}}
    onCancel={() => {}}
    {...props}
  />
);

const fields = (root: ReturnType<typeof useRenderToDom>) =>
  root.querySelectorAll('input[data-testid^="prompt-variable-input-"]');

describe('the dialog that asks for prompt values', () => {
  it('asks for one value per prompt, labelled with the prompt name', () => {
    const root = useRenderToDom(dialogTree({ names: ['OTP', 'User id'] }));

    expect(root.querySelectorAll('[data-testid="prompt-variable-input-container"]')).toHaveLength(2);
    expect(query(root, 'label[for="prompt-0"]').text).toBe('OTP');
    expect(query(root, 'label[for="prompt-1"]').text).toBe('User id');
  });

  it('points each label at the field it names', () => {
    const root = useRenderToDom(dialogTree({ names: ['OTP'] }));

    expect(query(root, 'label').getAttribute('for')).toBe(getByTestId(root, 'prompt-variable-input-0').id);
  });

  it('starts every field empty on each send', () => {
    const root = useRenderToDom(dialogTree({ names: ['OTP', 'Region'] }));

    expect(fields(root).map((field) => field.getAttribute('value'))).toEqual(['', '']);
  });

  it('matches the wording for the title and the two buttons', () => {
    const root = useRenderToDom(dialogTree());

    expect(query(root, '.modal-title').text).toContain('Input Required');
    expect(getByTestId(root, 'prompt-variables-submit').text).toBe('Continue');
    expect(getByTestId(root, 'prompt-variables-cancel').text).toBe('Cancel');
  });

  it('submits on the confirm button and does nothing destructive on the other', () => {
    const root = useRenderToDom(dialogTree());

    expect(getByTestId(root, 'prompt-variables-submit').getAttribute('type')).toBe('submit');
    expect(getByTestId(root, 'prompt-variables-cancel').getAttribute('type')).toBe('button');
  });

  it('uses the desktop placeholder and input attributes', () => {
    const root = useRenderToDom(dialogTree());
    const field = getByTestId(root, 'prompt-variable-input-0');

    expect(field.getAttribute('type')).toBe('text');
    expect(field.getAttribute('placeholder')).toBe('Enter value');
    expect(field.getAttribute('autoCorrect')).toBe('off');
    expect(field.getAttribute('spellcheck')).toBe('false');
  });

  it('adds no explanatory copy of its own, matching the desktop dialog', () => {
    const root = useRenderToDom(dialogTree());

    expect(root.text).not.toContain('saved to the collection');
  });

  it('renders as a dialog so assistive tech announces it', () => {
    const root = useRenderToDom(dialogTree());
    const dialog = query(root, '[role="dialog"]');

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Input Required');
  });

  it('renders nothing when the request needs no prompts', () => {
    const root = useRenderToDom(dialogTree({ names: [] }));

    expect(queryByTestId(root, 'prompt-variables-modal-content')).toBeNull();
  });

  it('shows no dialog while closed', () => {
    const root = useRenderToDom(dialogTree({ open: false }));

    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(queryByTestId(root, 'prompt-variables-modal-content')).toBeNull();
  });
});
