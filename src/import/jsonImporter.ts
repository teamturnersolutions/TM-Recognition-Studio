import { NOMINEE_COUNT } from '../types/recognition';

export interface ImportedNomineeDraft {
  name: string;
  photoUrl?: string;
}

export interface ImportedRecognitionDraft {
  selectedTemplateId?: string;
  recognitionPeriod?: string;
  nominees: [
    ImportedNomineeDraft,
    ImportedNomineeDraft,
    ImportedNomineeDraft,
    ImportedNomineeDraft,
    ImportedNomineeDraft,
    ImportedNomineeDraft,
  ];
  winnerIndex: number | null;
  winnerStoreDepartment?: string;
  winnerCategory?: string;
  winnerSummary?: string;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function parseNomineeEntry(entry: unknown): ImportedNomineeDraft {
  if (typeof entry === 'string') {
    return { name: entry.trim() };
  }
  if (isRecord(entry)) {
    const name = readString(entry.name, entry.fullName, entry.teamMemberName) ?? '';
    const photoUrl = readString(entry.photoUrl, entry.photo, entry.imageUrl, entry.avatarUrl);
    return photoUrl ? { name, photoUrl } : { name };
  }
  return { name: '' };
}

export function parseRecognitionJson(rawText: string): ImportedRecognitionDraft {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Invalid JSON file. Please check the file syntax and try again.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Recognition JSON must contain a top-level object.');
  }

  const warnings: string[] = [];
  const rawNominees = Array.isArray(parsed.nominees) ? parsed.nominees : null;
  if (!rawNominees) {
    throw new Error('JSON must include a "nominees" array (up to 6 nominees).');
  }

  if (rawNominees.length > NOMINEE_COUNT) {
    warnings.push(
      `JSON contained ${rawNominees.length} nominees; only the first ${NOMINEE_COUNT} were loaded.`,
    );
  }

  const nomineesList: ImportedNomineeDraft[] = [];
  for (let i = 0; i < NOMINEE_COUNT; i++) {
    nomineesList.push(parseNomineeEntry(rawNominees[i]));
  }
  const nominees = nomineesList as ImportedRecognitionDraft['nominees'];

  const winnerObj = isRecord(parsed.winner) ? parsed.winner : undefined;

  let winnerIndex: number | null = null;
  const zeroBasedCandidate = parsed.winnerIndex ?? winnerObj?.index;
  const oneBasedCandidate = parsed.winnerSlot ?? winnerObj?.slot;
  const winnerNameCandidate = readString(parsed.winnerName, winnerObj?.name);

  if (
    typeof zeroBasedCandidate === 'number' &&
    Number.isInteger(zeroBasedCandidate) &&
    zeroBasedCandidate >= 0 &&
    zeroBasedCandidate < NOMINEE_COUNT
  ) {
    winnerIndex = zeroBasedCandidate;
  } else if (
    typeof oneBasedCandidate === 'number' &&
    Number.isInteger(oneBasedCandidate) &&
    oneBasedCandidate >= 1 &&
    oneBasedCandidate <= NOMINEE_COUNT
  ) {
    winnerIndex = oneBasedCandidate - 1;
  } else if (winnerNameCandidate) {
    const target = winnerNameCandidate.toLowerCase();
    const matched = nominees.findIndex((n) => n.name.toLowerCase() === target);
    if (matched >= 0) {
      winnerIndex = matched;
    } else {
      warnings.push(
        `Winner name "${winnerNameCandidate}" did not match any of the 6 nominees; please select the winner below.`,
      );
    }
  }

  const recognitionPeriod = readString(parsed.recognitionPeriod, parsed.period);
  const selectedTemplateId = readString(parsed.selectedTemplateId, parsed.templateId);
  const winnerStoreDepartment = readString(
    parsed.winnerStoreDepartment,
    parsed.storeDepartment,
    winnerObj?.storeDepartment,
  );
  const winnerCategory = readString(
    parsed.recognizedFor,
    parsed.winnerCategory,
    parsed.category,
    winnerObj?.recognizedFor,
    winnerObj?.category,
  );
  const winnerSummary = readString(
    parsed.recognitionSummary,
    parsed.winnerSummary,
    parsed.summary,
    winnerObj?.recognitionSummary,
    winnerObj?.summary,
  );

  return {
    selectedTemplateId,
    recognitionPeriod,
    nominees,
    winnerIndex,
    winnerStoreDepartment,
    winnerCategory,
    winnerSummary,
    warnings,
  };
}

export function buildSampleRecognitionJson(): string {
  const sample = {
    recognitionPeriod: 'November 2026',
    nominees: [
      { name: 'Caleb Okafor', photoUrl: '' },
      { name: 'Daniel Kowalski', photoUrl: '' },
      { name: 'Devon Gallagher', photoUrl: '' },
      { name: 'Elena Rostova', photoUrl: '' },
      { name: 'Marcus Vance', photoUrl: '' },
      { name: 'Priya Nair', photoUrl: '' },
    ],
    winnerIndex: 4,
    recognizedFor: 'Go the Extra Mile',
    recognitionSummary:
      'Consistently supports teammates during peak weekend hours and delivers warm, efficient checkout service to every BJ’s member.',
  };
  return `${JSON.stringify(sample, null, 2)}\n`;
}
