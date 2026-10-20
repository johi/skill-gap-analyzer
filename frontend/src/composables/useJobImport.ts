import { computed, ref } from 'vue';
import { ZodError } from 'zod';
import { ApiError } from '@/api/client';
import { analyzeJobImport, commitJobImport } from '@/api/job-import';
import { normalizeReviewedJob, validateReviewedJob } from '@/services/job-import/reviewed-job';
import type { ReviewedJob, JobReviewStatus } from '@/services/job-import/reviewed-job';
import { importedJobSchema, jobDatasetSchema, reviewedImportSchema } from '@/schemas/job-import';
import type { ImportedJob, JobDataset, JobImportAnalysis, JobImportCommitResponse } from '@/schemas/job-import';

export function useJobImport() {
  const selectedFileName = ref<string | null>(null);
  const dataset = ref<JobDataset | null>(null);
  const analysis = ref<JobImportAnalysis | null>(null);
  const reviewedJobs = ref<ReviewedJob[]>([]);

  const editingJobIndex = ref<number | null>(null);
  const analyzing = ref(false);
  const savingJob = ref(false);
  const committing = ref(false);
  const showConfirmation = ref(false);
  const replaceExisting = ref(false);

  const commitResult = ref<JobImportCommitResponse | null>(null);

  const error = ref<string | null>(null);
  const validationErrors = ref<string[]>([]);

  const busy = computed(
      () => analyzing.value || savingJob.value || committing.value
  );

  const includedCount = computed(
      () => reviewedJobs.value.filter(job => !job.excluded).length
  );

  const excludedCount = computed(
      () => reviewedJobs.value.filter(job => job.excluded).length
  );

  const skillCounts = computed(() => {
    const counts = {
      existing: 0,
      new: 0,
      reviewRequired: 0,
    };

    for (const reviewedJob of reviewedJobs.value) {
      if (reviewedJob.excluded || !reviewedJob.analysis) {
        continue;
      }

      for (const skill of reviewedJob.analysis.skills) {
        switch (skill.resolution) {
          case 'existing':
            counts.existing++;
            break;
          case 'new':
            counts.new++;
            break;
          case 'review_required':
            counts.reviewRequired++;
            break;
        }
      }
    }

    return counts;
  });

  const reviewStatuses = computed<JobReviewStatus[]>(() =>
      reviewedJobs.value.map(validateReviewedJob)
  );

  const unresolvedJobCount = computed(
      () => reviewStatuses.value.filter(status => !status.valid).length
  );

  const readyToImport = computed(
      () =>
          analysis.value !== null &&
          includedCount.value > 0 &&
          unresolvedJobCount.value === 0 &&
          editingJobIndex.value === null &&
          !busy.value &&
          commitResult.value === null
  );

  function resetMessages(): void {
    error.value = null;
    validationErrors.value = [];
  }

  function setExcluded(jobIndex: number, excluded: boolean): void {
    const reviewedJob = reviewedJobs.value[jobIndex];

    if (!reviewedJob || busy.value || commitResult.value) {
      return;
    }

    reviewedJob.excluded = excluded;
    showConfirmation.value = false;

    if (excluded && editingJobIndex.value === jobIndex) {
      editingJobIndex.value = null;
    }
  }

  function startEditing(jobIndex: number): void {
    if (busy.value || commitResult.value) {
      return;
    }

    editingJobIndex.value = jobIndex;
    showConfirmation.value = false;
    resetMessages();
  }

  function cancelEditing(): void {
    if (savingJob.value) {
      return;
    }

    editingJobIndex.value = null;
    resetMessages();
  }

  async function saveReviewedJob(
      jobIndex: number,
      job: ImportedJob
  ): Promise<void> {
    const reviewedJob = reviewedJobs.value[jobIndex];

    if (
        !reviewedJob ||
        reviewedJob.excluded ||
        busy.value ||
        commitResult.value
    ) {
      return;
    }

    resetMessages();

    const parsed = importedJobSchema.safeParse(job);

    if (!parsed.success) {
      validationErrors.value = parsed.error.issues.map(issue => {
        const path = issue.path.join('.');

        return path
            ? `${path}: ${issue.message}`
            : issue.message;
      });

      return;
    }

    savingJob.value = true;

    try {
      const updatedJob = structuredClone(parsed.data);

      const result = await analyzeJobImport({
        version: 1,
        jobs: [updatedJob],
      });

      const analyzedJob = result.jobs[0];

      if (!analyzedJob || result.totalJobs !== 1) {
        throw new Error(
            'The analysis service returned an unexpected result.'
        );
      }

      reviewedJob.job = normalizeReviewedJob(updatedJob, analyzedJob);
      reviewedJob.analysis = analyzedJob;

      editingJobIndex.value = null;
      showConfirmation.value = false;
    } catch (err) {
      handleApiError(err, 'Unable to re-analyze the edited job.');
    } finally {
      savingJob.value = false;
    }
  }

  function handleApiError(err: unknown, fallback: string): void {
    if (
        err instanceof ApiError &&
        err.error === 'validation_error'
    ) {
      validationErrors.value = err.issues.map(issue =>
          issue.path
              ? `${issue.path}: ${issue.message}`
              : issue.message
      );

      if (validationErrors.value.length === 0) {
        error.value = err.message;
      }

      return;
    }

    error.value = err instanceof Error
        ? err.message
        : fallback;
  }

  async function handleFileChange(event: Event): Promise<void> {
    if (busy.value) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    selectedFileName.value = file?.name ?? null;
    dataset.value = null;
    analysis.value = null;
    reviewedJobs.value = [];
    editingJobIndex.value = null;
    showConfirmation.value = false;
    commitResult.value = null;

    resetMessages();

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed: unknown = JSON.parse(content);

      dataset.value = jobDatasetSchema.parse(parsed);
    } catch (err) {
      if (err instanceof ZodError) {
        validationErrors.value = err.issues.map(issue => {
          const path = issue.path.join('.');

          return path
              ? `${path}: ${issue.message}`
              : issue.message;
        });

        return;
      }

      error.value = err instanceof SyntaxError
          ? 'The selected file does not contain valid JSON.'
          : 'Unable to read the selected file.';
    }
  }

  async function handleAnalyze(): Promise<void> {
    if (!dataset.value || busy.value || commitResult.value) {
      return;
    }

    analyzing.value = true;
    analysis.value = null;
    reviewedJobs.value = [];
    editingJobIndex.value = null;
    showConfirmation.value = false;

    resetMessages();

    try {
      const result = await analyzeJobImport(dataset.value);

      if (result.jobs.length !== dataset.value.jobs.length) {
        throw new Error(
            'The analysis returned an unexpected number of jobs.'
        );
      }

      analysis.value = result;

      reviewedJobs.value = result.jobs.map(
          (analyzedJob, jobIndex) => ({
            jobIndex,
            excluded: false,
            job: normalizeReviewedJob(analyzedJob.job, analyzedJob),
            analysis: analyzedJob,
          })
      );
    } catch (err) {
      handleApiError(err, 'Unable to analyze the selected dataset.');
    } finally {
      analyzing.value = false;
    }
  }

  function requestCommit(): void {
    if (!readyToImport.value) {
      return;
    }

    resetMessages();
    showConfirmation.value = true;
  }

  async function handleCommit(): Promise<void> {
    if (
        !readyToImport.value ||
        !showConfirmation.value ||
        !dataset.value
    ) {
      return;
    }

    resetMessages();

    const reviewedImport = reviewedImportSchema.safeParse({
      version: 1,
      jobs: reviewedJobs.value.map(reviewedJob => ({
        jobIndex: reviewedJob.jobIndex,
        excluded: reviewedJob.excluded,
        job: reviewedJob.job,
      })),
    });

    if (!reviewedImport.success) {
      validationErrors.value = reviewedImport.error.issues.map(issue => {
        const path = issue.path.join('.');

        return path
            ? `${path}: ${issue.message}`
            : issue.message;
      });

      showConfirmation.value = false;
      return;
    }

    committing.value = true;

    try {
      const result = await commitJobImport(
          dataset.value,
          reviewedImport.data,
          replaceExisting.value
      );

      commitResult.value = result;
      showConfirmation.value = false;
    } catch (err) {
      showConfirmation.value = false;
      handleApiError(err, 'Unable to commit the reviewed import.');
    } finally {
      committing.value = false;
    }
  }

  return {
    selectedFileName, dataset, analysis, reviewedJobs,
    editingJobIndex, analyzing, savingJob, committing, showConfirmation, replaceExisting,
    commitResult, error, validationErrors,
    busy, includedCount, excludedCount, skillCounts, reviewStatuses,
    unresolvedJobCount, readyToImport,
    setExcluded, startEditing, cancelEditing, saveReviewedJob,
    handleFileChange, handleAnalyze, requestCommit, handleCommit,
  };
}
