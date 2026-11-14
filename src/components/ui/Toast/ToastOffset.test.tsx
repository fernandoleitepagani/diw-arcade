import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeedbackBar } from '../../session/FeedbackBar';

const toastCss = readFileSync('src/components/ui/Toast/Toast.css', 'utf8');
const prop = () =>
  document.documentElement.style.getPropertyValue('--feedback-bar-h');

describe('toast offset above the feedback bar', () => {
  it('publishes the bar height while mounted and clears it on unmount', () => {
    const { unmount } = render(
      <FeedbackBar verdict="correct" onContinue={() => {}} />,
    );
    expect(prop()).toMatch(/^\d+(\.\d+)?px$/);
    unmount();
    expect(prop()).toBe('');
  });

  it('lifts the toast stack by that height', () => {
    expect(toastCss).toMatch(/var\(--feedback-bar-h,\s*0px\)/);
  });
});
