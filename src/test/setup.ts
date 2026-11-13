import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Lazy routes (e.g. the CodeMirror-based challenge chunk) can take longer than
// the default 1000ms findBy timeout when the full suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

afterEach(cleanup);
