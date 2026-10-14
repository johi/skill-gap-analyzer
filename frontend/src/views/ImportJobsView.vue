
<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ZodError } from 'zod';
import {
  ArrowLeft,
  CheckCircle2,
  FileJson,
  Upload,
} from 'lucide-vue-next';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import JobImportReviewForm from '@/components/JobImportReviewForm.vue';
import { ApiError } from '@/api/client';
import {
  analyzeJobImport,
  commitJobImport,
} from '@/api/job-import';

import {
  importedJobSchema,
  jobDatasetSchema,
  reviewedImportSchema,
} from '@/schemas/job-import';

import type {
  ImportedJob,
  JobDataset,
  JobImportAnalysis,
  JobImportCommitResponse,
} from '@/schemas/job-import';

type AnalyzedJob = JobImportAnalysis['jobs'][number];

interface ReviewedJob {
  jobIndex: number;
  excluded: boolean;
  job: ImportedJob;
  analysis: AnalyzedJob | null;
}

interface JobReviewStatus {
  valid: boolean;
  errors: string[];
}

const selectedFileName = ref<string | null>(null);
const dataset = ref<JobDataset | null>(null);
const analysis = ref<JobImportAnalysis | null>(null);
const reviewedJobs = ref<ReviewedJob[]>([]);

const editingJobIndex = ref<number | null>(null);
const analyzing = ref(false);
const savingJob = ref(false);
const committing = ref(false);
const showConfirmation = ref(false);

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

function validateReviewedJob(reviewedJob: ReviewedJob): JobReviewStatus {
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

  const canonicalNames = new Map<string, number>();

  for (const skill of reviewedJob.analysis.skills) {
    if (skill.resolution === 'review_required') {
      errors.push(
          `Skill "${skill.name}" requires normalization review.`
      );
    }

    const canonicalName = skill.canonicalName.trim().toLowerCase();

    if (!canonicalName) {
      continue;
    }

    canonicalNames.set(
        canonicalName,
        (canonicalNames.get(canonicalName) ?? 0) + 1
    );
  }

  for (const [canonicalName, count] of canonicalNames) {
    if (count > 1) {
      errors.push(
          `Duplicate canonical skill "${canonicalName}".`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

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

function resolutionLabel(resolution: string): string {
  switch (resolution) {
    case 'existing':
      return 'Existing';
    case 'new':
      return 'New';
    case 'review_required':
      return 'Review required';
    default:
      return resolution;
  }
}

function requirementLabel(requirement: string): string {
  return requirement === 'must_have'
      ? 'Must have'
      : 'Nice to have';
}

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

    reviewedJob.job = updatedJob;
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
          job: structuredClone(analyzedJob.job),
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
        reviewedImport.data
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
</script>

<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/jobs">
        <ArrowLeft class="size-4" />
        Back to jobs
      </RouterLink>
    </Button>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Import jobs
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Analyze, review, and import jobs from a JSON dataset.
      </p>
    </div>

    <div
        v-if="error"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <div
        v-if="validationErrors.length"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="mb-2 text-sm font-medium text-destructive">
        Validation failed:
      </p>
      <ul class="list-disc space-y-1 pl-5 text-sm text-destructive">
        <li
            v-for="(message, index) in validationErrors"
            :key="index"
        >
          {{ message }}
        </li>
      </ul>
    </div>

    <Card v-if="commitResult">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <CheckCircle2 class="size-5 text-green-600" />
          Import completed
        </CardTitle>
        <CardDescription>
          The reviewed dataset was committed successfully.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <p>
          <strong>{{ commitResult.imported }}</strong>
          jobs imported.
        </p>
        <p>
          <strong>{{ commitResult.excluded }}</strong>
          jobs excluded.
        </p>
        <p class="text-sm text-muted-foreground">
          This import has been completed. Select another file
          to begin a new import.
        </p>
        <Button variant="outline" as-child>
          <RouterLink to="/jobs">
            View jobs
          </RouterLink>
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Select dataset</CardTitle>
        <CardDescription>
          Choose a version 1 JSON job dataset.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-5">
        <div class="space-y-2">
          <label for="job-import-file" class="text-sm font-medium">
            JSON file
          </label>
          <input
              id="job-import-file"
              type="file"
              accept=".json,application/json"
              class="block w-full rounded-md border p-3 text-sm"
              :disabled="busy"
              @change="handleFileChange"
          />
        </div>

        <div
            v-if="dataset"
            class="flex items-center gap-3 rounded-md border p-4"
        >
          <FileJson class="size-5 text-muted-foreground" />
          <div>
            <p class="text-sm font-medium">
              {{ selectedFileName }}
            </p>
            <p class="text-sm text-muted-foreground">
              {{ dataset.jobs.length }} jobs in dataset
            </p>
          </div>
        </div>

        <Button
            :disabled="!dataset || busy || !!commitResult"
            @click="handleAnalyze"
        >
          <Upload class="size-4" />
          {{ analyzing ? 'Analyzing...' : 'Analyze dataset' }}
        </Button>
      </CardContent>
    </Card>

    <template v-if="analysis && !commitResult">
      <Card>
        <CardHeader>
          <CardTitle>Analysis results</CardTitle>
          <CardDescription>
            No jobs have been imported yet.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Analyzed
              </p>
              <p class="text-2xl font-semibold">
                {{ analysis.totalJobs }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Included
              </p>
              <p class="text-2xl font-semibold">
                {{ includedCount }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-sm text-muted-foreground">
                Excluded
              </p>
              <p class="text-2xl font-semibold">
                {{ excludedCount }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-sm">
                        <span class="rounded-md bg-muted px-3 py-2">
                            Existing skills: {{ skillCounts.existing }}
                        </span>
            <span class="rounded-md bg-muted px-3 py-2">
                            New skills: {{ skillCounts.new }}
                        </span>
            <span
                class="rounded-md px-3 py-2"
                :class="
                                skillCounts.reviewRequired
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted'
                            "
            >
                            Skills requiring review:
                            {{ skillCounts.reviewRequired }}
                        </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review jobs</CardTitle>
          <CardDescription>
            Include, exclude, or edit jobs before committing.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-3">
          <div
              v-for="(reviewedJob, index) in reviewedJobs"
              :key="reviewedJob.jobIndex"
              class="rounded-md border"
              :class="reviewedJob.excluded ? 'opacity-60' : ''"
          >
            <div class="flex items-start gap-3 px-4 py-3">
              <input
                  :id="`include-job-${index}`"
                  type="checkbox"
                  class="mt-1 size-4 shrink-0"
                  :checked="!reviewedJob.excluded"
                  :disabled="busy"
                  :aria-label="
                                    `Include ${reviewedJob.job.company} — ${reviewedJob.job.title}`
                                "
                  @change="
                                    setExcluded(
                                        index,
                                        !($event.target as HTMLInputElement).checked
                                    )
                                "
              />

              <details class="min-w-0 flex-1">
                <summary class="cursor-pointer">
                                    <span class="font-medium">
                                        {{ reviewedJob.job.company }}
                                    </span>
                  <span class="text-muted-foreground">
                                        — {{ reviewedJob.job.title }}
                                    </span>
                  <span class="ml-2 text-xs text-muted-foreground">
                                        #{{ index + 1 }}
                                    </span>

                  <span
                      v-if="reviewedJob.excluded"
                      class="ml-2 text-xs text-muted-foreground"
                  >
                                        Excluded
                                    </span>
                  <span
                      v-else-if="!reviewStatuses[index]?.valid"
                      class="ml-2 text-xs font-medium text-destructive"
                  >
                                        Review required
                                    </span>
                  <span
                      v-else
                      class="ml-2 text-xs font-medium text-green-600"
                  >
                                        Ready to import
                                    </span>
                </summary>

                <div class="space-y-4 pt-4">
                  <div
                      v-if="
                                            !reviewedJob.excluded &&
                                            !reviewStatuses[index]?.valid
                                        "
                      class="rounded-md border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <p class="mb-2 text-sm font-medium text-destructive">
                      Issues to resolve
                    </p>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-destructive">
                      <li
                          v-for="(message, errorIndex) in reviewStatuses[index]?.errors"
                          :key="errorIndex"
                      >
                        {{ message }}
                      </li>
                    </ul>
                  </div>

                  <template v-if="editingJobIndex === index">
                    <p
                        v-if="savingJob"
                        class="text-sm text-muted-foreground"
                    >
                      Re-analyzing edited job...
                    </p>
                    <div
                        :class="
                                                savingJob
                                                    ? 'pointer-events-none opacity-60'
                                                    : ''
                                            "
                    >
                      <JobImportReviewForm
                          :key="index"
                          :job="reviewedJob.job"
                          @save="saveReviewedJob(index, $event)"
                          @cancel="cancelEditing"
                      />
                    </div>
                  </template>

                  <template v-else>
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm text-muted-foreground">
                        {{
                          reviewedJob.job.location
                          || 'Location unspecified'
                        }}
                        ·
                        {{
                          reviewedJob.job.seniority
                          || 'Seniority unspecified'
                        }}
                      </p>
                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          :disabled="reviewedJob.excluded || busy"
                          @click="startEditing(index)"
                      >
                        Edit job
                      </Button>
                    </div>

                    <p
                        v-if="!reviewedJob.analysis?.skills.length"
                        class="text-sm text-muted-foreground"
                    >
                      No skills specified.
                    </p>

                    <div
                        v-for="(skill, skillIndex) in reviewedJob.analysis?.skills ?? []"
                        :key="skillIndex"
                        class="rounded-md bg-muted/50 p-3 text-sm"
                    >
                      <div class="flex flex-wrap items-center gap-2">
                                                <span class="font-medium">
                                                    {{ skill.name }}
                                                </span>
                        <span class="text-muted-foreground">
                                                    ({{ skill.category }})
                                                </span>
                        <span
                            class="rounded px-2 py-1 text-xs"
                            :class="
                                                        skill.resolution === 'review_required'
                                                            ? 'bg-destructive/10 text-destructive'
                                                            : 'bg-background'
                                                    "
                        >
                                                    {{ resolutionLabel(skill.resolution) }}
                                                </span>
                      </div>
                      <p class="mt-2 text-muted-foreground">
                        Requirement:
                        {{ requirementLabel(skill.requirement) }}
                      </p>
                      <p
                          v-if="skill.canonicalName !== skill.name"
                          class="mt-1 text-muted-foreground"
                      >
                        Canonical name:
                        {{ skill.canonicalName }}
                      </p>
                      <p
                          v-if="skill.conflictingRequirements?.length"
                          class="mt-1 text-destructive"
                      >
                        Conflicting requirements:
                        {{
                          skill.conflictingRequirements
                              .map(requirementLabel)
                              .join(', ')
                        }}
                      </p>
                    </div>
                  </template>
                </div>
              </details>
            </div>
          </div>

          <p
              v-if="reviewedJobs.length === 0"
              class="text-sm text-muted-foreground"
          >
            The dataset contains no jobs.
          </p>

          <div class="mt-6 space-y-4 border-t pt-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="text-sm">
                <p>
                  <strong>{{ includedCount }}</strong>
                  jobs included,
                  <strong>{{ excludedCount }}</strong>
                  excluded
                </p>
                <p
                    v-if="unresolvedJobCount > 0"
                    class="text-destructive"
                >
                  {{ unresolvedJobCount }}
                  jobs require review
                </p>
                <p
                    v-else-if="editingJobIndex !== null"
                    class="text-muted-foreground"
                >
                  Save or cancel the current edit to continue.
                </p>
                <p v-else class="text-green-600">
                  All included jobs are ready to import.
                </p>
              </div>

              <Button
                  :disabled="!readyToImport"
                  @click="requestCommit"
              >
                Commit reviewed import
              </Button>
            </div>

            <div
                v-if="showConfirmation"
                class="space-y-4 rounded-md border p-4"
            >
              <h3 class="font-semibold">
                Confirm import
              </h3>
              <p class="text-sm">
                You are about to import
                <strong>{{ includedCount }}</strong>
                jobs into the database and exclude
                <strong>{{ excludedCount }}</strong>
                jobs.
              </p>
              <p class="text-sm text-muted-foreground">
                This operation creates persistent job records.
                Review your selection before proceeding.
              </p>

              <div class="flex flex-wrap gap-3">
                <Button
                    :disabled="committing || !readyToImport"
                    @click="handleCommit"
                >
                  {{
                    committing
                        ? 'Importing...'
                        : 'Confirm import'
                  }}
                </Button>
                <Button
                    variant="outline"
                    :disabled="committing"
                    @click="showConfirmation = false"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
