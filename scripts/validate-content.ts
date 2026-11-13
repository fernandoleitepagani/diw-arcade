import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NODE_IDS, type NodeId } from '../src/content/tree';
import { runInJsdom } from '../src/features/runner/jsdomRunner';
import { createSnippetRunner } from './lib/snippet/runSnippet';
import {
  FILE_KINDS,
  formatReport,
  validateContent,
  type ContentFile,
  type FileKind,
  type ValidateOptions,
} from './lib/validate';

const NODE_DIR_PATTERN = /^n\d{2}$/;
const NODE_FILE_PATTERN = /^(questions|flashcards|challenges)\.json$/;

function parseOnly(
  value: string | undefined,
): { only: { nodeId: NodeId; kind?: FileKind } } | { invalid: string } {
  const parts = (value ?? '').split('/');
  const [nodeId, kind] = parts;
  if (
    !value ||
    parts.length > 2 ||
    !nodeId ||
    !(NODE_IDS as readonly string[]).includes(nodeId) ||
    (kind !== undefined && !(FILE_KINDS as readonly string[]).includes(kind))
  ) {
    return { invalid: value ?? '(ausente)' };
  }
  return {
    only: {
      nodeId: nodeId as NodeId,
      ...(kind ? { kind: kind as FileKind } : {}),
    },
  };
}

function parseArgs(argv: readonly string[]): {
  opts: ValidateOptions;
  invalidNode?: string;
  invalidOnly?: string;
} {
  const opts: ValidateOptions = {};
  const nodeIndex = argv.indexOf('--node');
  const nodeValue = nodeIndex >= 0 ? argv[nodeIndex + 1] : undefined;
  const onlyIndex = argv.indexOf('--only');
  const onlyValue = onlyIndex >= 0 ? argv[onlyIndex + 1] : undefined;

  if (argv.includes('--require-all')) {
    opts.requireAll = true;
  }
  if (argv.includes('--with-challenges')) {
    opts.withChallenges = true;
  }
  if (nodeValue && (NODE_IDS as readonly string[]).includes(nodeValue)) {
    opts.node = nodeValue as NodeId;
  }
  if (nodeIndex >= 0 && !opts.node) {
    return { opts, invalidNode: nodeValue ?? '(ausente)' };
  }

  if (onlyIndex >= 0) {
    const parsed = parseOnly(onlyValue);
    if ('invalid' in parsed) {
      return { opts, invalidOnly: parsed.invalid };
    }
    opts.only = parsed.only;
  }

  const sources = process.env.DIW_SOURCES;
  if (sources) {
    opts.sourcesDir = sources;
  }
  const repo = process.env.DIW_REPO;
  if (repo) {
    opts.repoDir = repo;
  }
  return { opts };
}

function readContentFiles(root: string): ContentFile[] {
  const contentDir = join(root, 'src', 'content');
  if (!existsSync(contentDir)) {
    return [];
  }

  const files: ContentFile[] = [];
  const read = (path: string): ContentFile => {
    try {
      return { path, data: JSON.parse(readFileSync(path, 'utf8')) as unknown };
    } catch (error) {
      return {
        path,
        readError: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const entries = readdirSync(contentDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = join(contentDir, entry.name);
    if (NODE_DIR_PATTERN.test(entry.name)) {
      const nodeFiles = readdirSync(directory)
        .filter((name) => NODE_FILE_PATTERN.test(name))
        .sort();
      for (const name of nodeFiles) {
        files.push(read(join(directory, name)));
      }
    } else if (entry.name === 'labs') {
      const labFiles = readdirSync(directory)
        .filter((name) => name.endsWith('.json'))
        .sort();
      for (const name of labFiles) {
        files.push(read(join(directory, name)));
      }
    }
  }
  return files;
}

async function main(): Promise<void> {
  const { opts, invalidNode, invalidOnly } = parseArgs(process.argv.slice(2));
  if (invalidNode) {
    console.log(`ERROR - -: nó inválido: ${invalidNode}`);
    console.log('content FAILED: 1 errors');
    process.exitCode = 1;
    return;
  }
  if (invalidOnly) {
    console.log(`ERROR - -: --only inválido: ${invalidOnly}`);
    console.log('content FAILED: 1 errors');
    process.exitCode = 1;
    return;
  }

  const snippetRunner = createSnippetRunner();
  try {
    const report = await validateContent(readContentFiles(process.cwd()), {
      ...opts,
      runChallenge: ({ challenge, files }) => runInJsdom(challenge, files),
      runSnippet: (spec) => snippetRunner.run(spec),
    });
    for (const line of formatReport(report)) {
      console.log(line);
    }
    process.exitCode = report.ok ? 0 : 1;
  } finally {
    await snippetRunner.close();
  }
}

await main();
