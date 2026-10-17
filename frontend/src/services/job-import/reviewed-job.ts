import { importedJobSchema } from '@/schemas/job-import';
import type { ImportedJob, JobImportAnalysis } from '@/schemas/job-import';

export type AnalyzedJob = JobImportAnalysis['jobs'][number];

export interface ReviewedJob {
  jobIndex: number;
  excluded: boolean;
  job: ImportedJob;
  analysis: AnalyzedJob | null;
}

export interface JobReviewStatus {
  valid: boolean;
  errors: string[];
}

/**
 * Apply safe, same-requirement canonicalization to the actual commit payload.
 * Conflicting requirements remain untouched and require an explicit edit.
 */
export function normalizeReviewedJob(job: ImportedJob, analyzed: AnalyzedJob): ImportedJob {
  const normalized = structuredClone(job);
  const requirementsByKey = new Map<string, Set<string>>();

  for (const skill of normalized.skills) {
    const key = skill.name.trim().toLowerCase();
    const requirements = requirementsByKey.get(key) ?? new Set<string>();
    requirements.add(skill.requirement);
    requirementsByKey.set(key, requirements);
  }

  const canonicalByKey = new Map(
      analyzed.skills.map(skill => [skill.canonicalName.trim().toLowerCase(), skill])
  );
  const seen = new Set<string>();

  normalized.skills = normalized.skills.filter(skill => {
    const key = skill.name.trim().toLowerCase();
    const canonical = canonicalByKey.get(key);
    const canonicalKey = canonical?.canonicalName.trim().toLowerCase() ?? key;

    // Never choose a requirement on behalf of the user.
    if (requirementsByKey.get(key)?.size !== 1 ||
        canonical?.resolution === 'review_required') {
      return true;
    }

    if (seen.has(canonicalKey)) {
      return false;
    }
    seen.add(canonicalKey);
    return true;
  });

  return normalized;
}

export function validateReviewedJob(reviewedJob: ReviewedJob): JobReviewStatus {
  if (reviewedJob.excluded) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  const result = importedJobSchema.safeParse(reviewedJob.job);

  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');

      errors.push(
          path ? `${path}: ${issue.message}` : issue.message
      );
    }
  }

  if (!reviewedJob.analysis) {
    errors.push('This job requires analysis.');
    return { valid: false, errors };
  }

  for (const skill of reviewedJob.analysis.skills) {
    if (skill.resolution === 'review_required') {
      errors.push(`Skill "${skill.name}" requires normalization review.`);
    }
  }

  // Validate the exact payload that will be committed, not just its analysis.
  const requirementsBySkill = new Map<string, string>();
  for (const skill of reviewedJob.job.skills) {
    const key = skill.name.trim().toLowerCase();
    const previous = requirementsBySkill.get(key);
    if (previous !== undefined) {
      errors.push(previous === skill.requirement
          ? `Duplicate canonical skill "${skill.name}".`
          : `Conflicting requirements for skill "${skill.name}".`);
    } else {
      requirementsBySkill.set(key, skill.requirement);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

