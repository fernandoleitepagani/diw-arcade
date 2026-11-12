import { EditorView, runScopeHandlers } from '@codemirror/view';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CodeEditor } from './CodeEditor';

function getView(container: HTMLElement): EditorView {
  const editor = container.querySelector('.cm-editor');
  expect(editor).not.toBeNull();
  const view = EditorView.findFromDOM(editor as HTMLElement);
  if (view === null) {
    throw new Error('EditorView não encontrada');
  }
  return view;
}

function key(keyName: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: keyName, ...init });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CodeEditor', () => {
  it('renders line numbers', () => {
    const { container } = render(
      <CodeEditor
        language="html"
        value="<h1>Olá</h1>"
        onChange={() => {}}
        onRun={() => {}}
        label="Código HTML"
      />,
    );

    expect(container.querySelector('.cm-lineNumbers')).not.toBeNull();
    expect(container.querySelector('[aria-label="Código HTML"]')).not.toBeNull();
  });

  it('calls onRun when Mod-Enter is pressed', () => {
    const onRun = vi.fn();
    const { container } = render(
      <CodeEditor
        language="js"
        value="console.log('oi');"
        onChange={() => {}}
        onRun={onRun}
        label="Código JavaScript"
      />,
    );

    const view = getView(container);
    const handled = runScopeHandlers(
      view,
      key('Enter', { ctrlKey: true }),
      'editor',
    );

    expect(handled).toBe(true);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('releases Tab after Escape so focus can move on', () => {
    const { container } = render(
      <CodeEditor
        language="css"
        value=".cartao { color: white; }"
        onChange={() => {}}
        onRun={() => {}}
        label="Código CSS"
      />,
    );

    const view = getView(container);
    const before = view.state.doc.toString();

    runScopeHandlers(view, key('Escape'), 'editor');
    const handled = runScopeHandlers(view, key('Tab'), 'editor');

    expect(handled).toBe(false);
    expect(view.state.doc.toString()).toBe(before);
  });

  it('releases Shift-Tab after Escape as well', () => {
    const { container } = render(
      <CodeEditor
        language="css"
        value="  .cartao { color: white; }"
        onChange={() => {}}
        onRun={() => {}}
        label="Código CSS"
      />,
    );

    const view = getView(container);
    const before = view.state.doc.toString();

    runScopeHandlers(view, key('Escape'), 'editor');
    const handled = runScopeHandlers(
      view,
      key('Tab', { shiftKey: true }),
      'editor',
    );

    expect(handled).toBe(false);
    expect(view.state.doc.toString()).toBe(before);
  });

  it('indents with Tab when Escape was not pressed', () => {
    const { container } = render(
      <CodeEditor
        language="css"
        value=".cartao { color: white; }"
        onChange={() => {}}
        onRun={() => {}}
        label="Código CSS"
      />,
    );

    const view = getView(container);
    view.dispatch({ selection: { anchor: 0 } });
    const before = view.state.doc.toString();

    const handled = runScopeHandlers(view, key('Tab'), 'editor');

    expect(handled).toBe(true);
    expect(view.state.doc.toString()).not.toBe(before);
  });
});
