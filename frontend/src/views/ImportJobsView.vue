
<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ZodError } from 'zod';
import { ArrowLeft, FileJson, Upload } from 'lucide-vue-next';

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
import { analyzeJobImport } from '@/api/job-import';
import {
  importedJobSchema,
  jobDatasetSchema,
} from '@/schemas/job-import';

import type {
  ImportedJob,
  JobDataset,
  JobImportAnalysis,
} from '@/schemas/job-import';

interface ReviewedJob {
  jobIndex: number;
  excluded: boolean;
  job: ImportedJob;
}

const selectedFileName = ref<string | null>(null);
const dataset = ref<JobDataset | null>(null);
const analysis = ref<JobImportAnalysis | null>(null);
const reviewedJobs = ref<ReviewedJob[]>([]);

const editingJobIndex = ref<number | null>(null);
const analyzing = ref(false);

const error = ref<string | null>(null);
const validationErrors = ref<string[]>([]);

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

  if (!analysis.value) {
    return counts;
  }

  for (const analyzedJob of analysis.value.jobs) {
    for (const skill of analyzedJob.skills) {
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

function setExcluded(jobIndex: number, excluded: boolean): void {
  const reviewedJob = reviewedJobs.value[jobIndex];

  if (reviewedJob) {
    reviewedJob.excluded = excluded;
  }

  if (excluded && editingJobIndex.value === jobIndex) {
    editingJobIndex.value = null;
  }
}

function startEditing(jobIndex: number): void {
  editingJobIndex.value = jobIndex;
  error.value = null;
  validationErrors.value = [];
}

function cancelEditing(): void {
  editingJobIndex.value = null;
  error.value = null;
  validationErrors.value = [];
}

function saveReviewedJob(jobIndex: number, job: ImportedJob): void {
  const reviewedJob = reviewedJobs.value[jobIndex];

  if (!reviewedJob || reviewedJob.excluded) {
    return;
  }

  const result = importedJobSchema.safeParse(job);

  if (!result.success) {
    validationErrors.value = result.error.issues.map(issue => {
      const path = issue.path.join('.');

      return path
          ? `${path}: ${issue.message}`
          : issue.message;
    });

    return;
  }

  reviewedJob.job = structuredClone(result.data);

  editingJobIndex.value = null;
  error.value = null;
  validationErrors.value = [];
}

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  selectedFileName.value = file?.name ?? null;

  dataset.value = null;
  analysis.value = null;
  reviewedJobs.value = [];
  editingJobIndex.value = null;

  error.value = null;
  validationErrors.value = [];

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
  if (!dataset.value || analyzing.value) {
    return;
  }

  analyzing.value = true;

  analysis.value = null;
  reviewedJobs.value = [];
  editingJobIndex.value = null;

  error.value = null;
  validationErrors.value = [];

  try {
    const result = await analyzeJobImport(dataset.value);

    analysis.value = result;

    reviewedJobs.value = result.jobs.map(
        (analyzedJob, jobIndex) => ({
          jobIndex,
          excluded: false,
          job: structuredClone(analyzedJob.job),
        })
    );
  } catch (err) {
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
        : 'Unable to analyze the selected dataset.';
  } finally {
    analyzing.value = false;
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
        Analyze and review jobs before importing them.
      </p>
    </div>

    <div
        v-if="error"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="text-sm text-destructive">
        {{ error }}
      </p>
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

    <Card>
      <CardHeader>
        <CardTitle>Select dataset</CardTitle>

        <CardDescription>
          Choose a version 1 JSON job dataset.
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-5">
        <div class="space-y-2">
          <label
              for="job-import-file"
              class="text-sm font-medium"
          >
            JSON file
          </label>

          <input
              id="job-import-file"
              type="file"
              accept=".json,application/json"
              class="block w-full rounded-md border p-3 text-sm"
              :disabled="analyzing"
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
              {{ dataset.jobs.length }} jobs ready for analysis
            </p>
          </div>
        </div>

        <Button
            :disabled="!dataset || analyzing"
            @click="handleAnalyze"
        >
          <Upload class="size-4" />

          {{ analyzing ? 'Analyzing...' : 'Analyze dataset' }}
        </Button>
      </CardContent>
    </Card>

    <template v-if="analysis">
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
            Include, exclude, or edit jobs before importing.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-3">
          <div
              v-for="(analyzedJob, index) in analysis.jobs"
              :key="index"
              class="rounded-md border"
              :class="
                            reviewedJobs[index]?.excluded
                                ? 'opacity-60'
                                : ''
                        "
          >
            <div class="flex items-start gap-3 px-4 py-3">
              <input
                  :id="`include-job-${index}`"
                  type="checkbox"
                  class="mt-1 size-4 shrink-0"
                  :checked="!reviewedJobs[index]?.excluded"
                  :aria-label="
                                    `Include ${reviewedJobs[index]?.job.company} — ${reviewedJobs[index]?.job.title}`
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
                                        {{ reviewedJobs[index]?.job.company }}
                                    </span>

                  <span class="text-muted-foreground">
                                        — {{ reviewedJobs[index]?.job.title }}
                                    </span>

                  <span class="ml-2 text-xs text-muted-foreground">
                                        #{{ index + 1 }}
                                    </span>

                  <span
                      v-if="
                                            analyzedJob.skills.some(
                                                skill =>
                                                    skill.resolution === 'review_required'
                                            )
                                        "
                      class="ml-2 text-xs font-medium text-destructive"
                  >
                                        Review required
                                    </span>
                </summary>

                <div class="space-y-4 pt-4">
                  <template v-if="editingJobIndex === index">
                    <JobImportReviewForm
                        v-if="reviewedJobs[index]"
                        :key="index"
                        :job="reviewedJobs[index]!.job"
                        @save="saveReviewedJob(index, $event)"
                        @cancel="cancelEditing"
                    />
                  </template>

                  <template v-else>
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-sm text-muted-foreground">
                        {{
                          reviewedJobs[index]?.job.location
                          || 'Location unspecified'
                        }}
                        ·
                        {{
                          reviewedJobs[index]?.job.seniority
                          || 'Seniority unspecified'
                        }}
                      </p>

                      <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          :disabled="reviewedJobs[index]?.excluded"
                          @click="startEditing(index)"
                      >
                        Edit job
                      </Button>
                    </div>

                    <p
                        v-if="analyzedJob.skills.length === 0"
                        class="text-sm text-muted-foreground"
                    >
                      No skills specified.
                    </p>

                    <div
                        v-for="(skill, skillIndex) in analyzedJob.skills"
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
              v-if="analysis.jobs.length === 0"
              class="text-sm text-muted-foreground"
          >
            The dataset contains no jobs.
          </p>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
