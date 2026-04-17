import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type DeprecatedPrimeNgInput = {
  guidance: string;
  property: string;
  selector: string;
  source: string;
};

type DeprecatedPrimeNgFinding = DeprecatedPrimeNgInput & {
  file: string;
  line: number;
  snippet: string;
};

describe('PrimeNG deprecated inputs', () => {
  it('does not use deprecated template inputs in go-web sources', () => {
    const workspaceRoot = findWorkspaceRoot(
      dirname(fileURLToPath(import.meta.url)),
    );
    const deprecatedInputs = readDeprecatedPrimeNgInputs(workspaceRoot);
    const findings = findDeprecatedPrimeNgUsage(workspaceRoot, deprecatedInputs);

    expect(findings, formatFindings(findings)).toEqual([]);
  });
});

function findWorkspaceRoot(startDirectory: string): string {
  let currentDirectory = startDirectory;

  while (true) {
    if (
      existsSync(join(currentDirectory, 'nx.json')) &&
      existsSync(join(currentDirectory, 'package.json'))
    ) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error('Could not locate the workspace root.');
    }

    currentDirectory = parentDirectory;
  }
}

function readDeprecatedPrimeNgInputs(
  workspaceRoot: string,
): DeprecatedPrimeNgInput[] {
  const primengTypesDirectory = join(workspaceRoot, 'node_modules', 'primeng', 'types');
  const inputs = new Map<string, DeprecatedPrimeNgInput>();

  for (const entry of readdirSync(primengTypesDirectory)) {
    if (!entry.endsWith('.d.ts')) {
      continue;
    }

    const declarationText = readFileSync(
      join(primengTypesDirectory, entry),
      'utf8',
    );
    const componentBlock = declarationText.match(
      /declare class [^{]+{([\s\S]*?)static ɵcmp:/m,
    )?.[1];

    if (!componentBlock) {
      continue;
    }

    const selector = readPrimeNgSelector(workspaceRoot, entry);

    if (!selector) {
      continue;
    }

    for (const match of componentBlock.matchAll(
      /\/\*\*[\s\S]*?@deprecated([\s\S]*?)\*\/\s*([A-Za-z_$][\w$]*)\??:/g,
    )) {
      const property = match[2];
      const key = `${selector}:${property}`;

      inputs.set(key, {
        selector,
        property,
        source: entry,
        guidance: normalizeDeprecatedGuidance(match[1]),
      });
    }
  }

  return [...inputs.values()].sort(
    (left, right) =>
      left.selector.localeCompare(right.selector) ||
      left.property.localeCompare(right.property),
  );
}

function readPrimeNgSelector(
  workspaceRoot: string,
  declarationFileName: string,
): string | null {
  const moduleFileName = declarationFileName.replace(/\.d\.ts$/, '.mjs');
  const modulePath = join(
    workspaceRoot,
    'node_modules',
    'primeng',
    'fesm2022',
    moduleFileName,
  );

  if (!existsSync(modulePath)) {
    return null;
  }

  const moduleText = readFileSync(modulePath, 'utf8');
  return moduleText.match(/selector:\s*"([^"]+)"/)?.[1] ?? null;
}

function normalizeDeprecatedGuidance(rawComment: string): string {
  return rawComment
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter(Boolean)
    .join(' ');
}

function findDeprecatedPrimeNgUsage(
  workspaceRoot: string,
  deprecatedInputs: readonly DeprecatedPrimeNgInput[],
): DeprecatedPrimeNgFinding[] {
  const sourceDirectories = [
    join(workspaceRoot, 'apps', 'go-web'),
    join(workspaceRoot, 'libs', 'go', 'web'),
  ];
  const findings: DeprecatedPrimeNgFinding[] = [];

  for (const sourceFile of sourceDirectories.flatMap(collectSourceFiles)) {
    const sourceText = readFileSync(sourceFile, 'utf8');
    const sourceLines = sourceText.split(/\r?\n/);

    for (const input of deprecatedInputs) {
      const usagePattern = new RegExp(
        `<${escapeForRegex(input.selector)}\\b[^>]*?(?:\\[${escapeForRegex(input.property)}\\]|${escapeForRegex(input.property)})\\s*=`,
        'gs',
      );

      for (const match of sourceText.matchAll(usagePattern)) {
        const matchIndex = match.index ?? 0;
        const line = sourceText.slice(0, matchIndex).split(/\r?\n/).length;

        findings.push({
          ...input,
          file: relative(workspaceRoot, sourceFile),
          line,
          snippet: sourceLines[line - 1]?.trim() ?? '',
        });
      }
    }
  }

  return findings.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.selector.localeCompare(right.selector) ||
      left.property.localeCompare(right.property),
  );
}

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (!['.html', '.ts'].includes(extname(entry.name))) {
      continue;
    }

    if (
      entry.name.endsWith('.d.ts') ||
      entry.name.endsWith('.spec.ts') ||
      entry.name.endsWith('.test.ts')
    ) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatFindings(findings: readonly DeprecatedPrimeNgFinding[]): string {
  if (findings.length === 0) {
    return 'No deprecated PrimeNG template inputs found.';
  }

  return [
    'Found deprecated PrimeNG template inputs in go-web sources:',
    ...findings.map(
      (finding) =>
        `- ${finding.file}:${finding.line} <${finding.selector}> uses "${finding.property}" (${finding.guidance}) :: ${finding.snippet}`,
    ),
  ].join('\n');
}
