import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, Prec } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  type Command,
  type KeyBinding,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'react';
import './CodeEditor.css';

export type EditorLanguage = 'html' | 'css' | 'js';

export interface CodeEditorProps {
  language: EditorLanguage;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  label: string;
}

const codeHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#ff4fd8' },
  {
    tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
    color: '#2de2e6',
  },
  {
    tag: [tags.function(tags.variableName), tags.labelName],
    color: '#ffc23d',
  },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: '#ffc23d',
  },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.number,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: '#7cff6b',
  },
  {
    tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link],
    color: '#2de2e6',
  },
  { tag: [tags.meta, tags.comment], color: '#a8b4d4', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.heading, color: '#ff4fd8', fontWeight: 'bold' },
  {
    tag: [tags.atom, tags.bool, tags.special(tags.variableName)],
    color: '#ffc23d',
  },
  {
    tag: [tags.processingInstruction, tags.string, tags.inserted],
    color: '#7cff6b',
  },
  { tag: tags.invalid, color: '#ff6b8b' },
]);

const codeTheme = EditorView.theme(
  {
    '&': {
      minHeight: '18rem',
      backgroundColor: 'var(--surface)',
      color: 'var(--text)',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '0.875rem',
    },
    '&.cm-focused': {
      outline: '2px solid var(--accent)',
      outlineOffset: '-2px',
    },
    '.cm-scroller': {
      minHeight: '18rem',
      maxHeight: '32rem',
      overflow: 'auto',
      lineHeight: '1.6',
    },
    '.cm-content': {
      padding: '0.75rem 0',
      caretColor: 'var(--accent)',
    },
    '.cm-line': {
      padding: '0 0.75rem',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--surface-2)',
      color: 'var(--text-muted)',
      borderRight: '1px solid var(--border)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 0.5rem 0 0.75rem',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgb(45 226 230 / 0.06)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgb(45 226 230 / 0.1)',
      color: 'var(--accent)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgb(45 226 230 / 0.24)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--accent)',
    },
  },
  { dark: true },
);

/**
 * Wraps an indent command so the first Tab after Escape is left unhandled and
 * the browser can move focus out of the editor.
 */
function guardEscape(
  escapePending: { current: boolean },
  command: Command,
): Command {
  return (target) => {
    if (escapePending.current) {
      escapePending.current = false;
      return false;
    }
    return command(target);
  };
}

function languageExtension(language: EditorLanguage) {
  switch (language) {
    case 'css':
      return css();
    case 'js':
      return javascript();
    default:
      return html({ autoCloseTags: false });
  }
}

/**
 * A deliberately small CodeMirror 6 editor: line numbers, history, a dark
 * highlight style and a Mod-Enter runner. No autocomplete or bracket
 * closing. Escape followed by Tab releases the editor so focus can move on.
 */
export function CodeEditor({
  language,
  value,
  onChange,
  onRun,
  label,
}: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef<Compartment | null>(null);
  const escapePending = useRef(false);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const initialValue = useRef(value);
  const initialLanguage = useRef(language);
  const initialLabel = useRef(label);

  useEffect(() => {
    onChangeRef.current = onChange;
    onRunRef.current = onRun;
  }, [onChange, onRun]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    if (languageCompartment.current === null) {
      languageCompartment.current = new Compartment();
    }

    const escapeBinding: KeyBinding = {
      key: 'Escape',
      run: () => {
        escapePending.current = true;
        return false;
      },
    };

    const tabBinding: KeyBinding = {
      ...indentWithTab,
      run: guardEscape(escapePending, indentWithTab.run ?? (() => false)),
      shift: indentWithTab.shift
        ? guardEscape(escapePending, indentWithTab.shift)
        : undefined,
    };

    const runnerBinding: KeyBinding = {
      key: 'Mod-Enter',
      run: () => {
        onRunRef.current();
        return true;
      },
    };

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          Prec.highest(keymap.of([escapeBinding, tabBinding, runnerBinding])),
          syntaxHighlighting(codeHighlight),
          languageCompartment.current.of(languageExtension(initialLanguage.current)),
          EditorView.contentAttributes.of({
            'aria-label': initialLabel.current,
            spellcheck: 'false',
            autocapitalize: 'off',
          }),
          EditorView.domEventHandlers({
            blur: () => {
              escapePending.current = false;
              return false;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.lineWrapping,
          codeTheme,
        ],
      }),
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const compartment = languageCompartment.current;
    if (!view || !compartment) {
      return;
    }
    view.dispatch({
      effects: compartment.reconfigure(languageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  useEffect(() => {
    viewRef.current?.contentDOM.setAttribute('aria-label', label);
  }, [label]);

  return <div className="code-editor" ref={hostRef} />;
}
