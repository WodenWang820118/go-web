export const MAX_DISPLAY_NAME_LENGTH = 24;

interface UniqueDisplayNameOptions {
  currentName?: string | null;
  maxLength?: number;
}

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Returns a room-safe display name by suffixing duplicates with " (2)", " (3)", etc.
 */
export function createUniqueDisplayName(
  requestedName: string,
  existingNames: Iterable<string>,
  options: UniqueDisplayNameOptions = {}
): string {
  const normalizedName = normalizeDisplayName(requestedName);

  if (normalizedName.length === 0) {
    return normalizedName;
  }

  const currentName = options.currentName
    ? normalizeDisplayName(options.currentName)
    : null;
  const maxLength = options.maxLength ?? MAX_DISPLAY_NAME_LENGTH;
  const takenNames = new Set<string>();

  for (const name of existingNames) {
    const normalizedExistingName = normalizeDisplayName(name);

    if (
      normalizedExistingName.length === 0 ||
      normalizedExistingName.toLocaleLowerCase() ===
        currentName?.toLocaleLowerCase()
    ) {
      continue;
    }

    takenNames.add(normalizedExistingName.toLocaleLowerCase());
  }

  if (!takenNames.has(normalizedName.toLocaleLowerCase())) {
    return normalizedName;
  }

  let duplicateIndex = 2;

  while (true) {
    const suffix = ` (${duplicateIndex})`;
    const baseMaxLength = Math.max(1, maxLength - suffix.length);
    const candidateBase = normalizedName.slice(0, baseMaxLength).trimEnd();
    const candidate = `${candidateBase}${suffix}`;

    if (!takenNames.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }

    duplicateIndex += 1;
  }
}
