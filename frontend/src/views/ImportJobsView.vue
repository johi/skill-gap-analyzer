<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useJobImport } from '@/composables/useJobImport';
import ImportSuccessSummary from '@/components/job-import/ImportSuccessSummary.vue';
import ImportFileSelector from '@/components/job-import/ImportFileSelector.vue';
import ImportAnalysisSummary from '@/components/job-import/ImportAnalysisSummary.vue';
import ImportJobReviewList from '@/components/job-import/ImportJobReviewList.vue';

const {
  selectedFileName, dataset, analysis, reviewedJobs,
  editingJobIndex, analyzing, savingJob, committing, showConfirmation, replaceExisting,
  commitResult, error, validationErrors,
  busy, includedCount, excludedCount, skillCounts, reviewStatuses,
  unresolvedJobCount, readyToImport,
  setExcluded, startEditing, cancelEditing, saveReviewedJob,
  handleFileChange, handleAnalyze, requestCommit, handleCommit,
} = useJobImport();
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

    <ImportSuccessSummary v-if="commitResult" :result="commitResult" />
    <ImportFileSelector
        :selected-file-name="selectedFileName"
        :dataset="dataset"
        :busy="busy"
        :analyzing="analyzing"
        :completed="!!commitResult"
        @file-change="handleFileChange"
        @analyze="handleAnalyze"
    />
    <template v-if="analysis && !commitResult">
      <ImportAnalysisSummary
          :analysis="analysis"
          :included-count="includedCount"
          :excluded-count="excludedCount"
          :skill-counts="skillCounts"
      />
      <ImportJobReviewList
          :reviewed-jobs="reviewedJobs"
          :review-statuses="reviewStatuses"
          :busy="busy"
          :editing-job-index="editingJobIndex"
          :saving-job="savingJob"
          :included-count="includedCount"
          :excluded-count="excludedCount"
          :unresolved-job-count="unresolvedJobCount"
          :ready-to-import="readyToImport"
          :show-confirmation="showConfirmation"
          :replace-existing="replaceExisting"
          @update:replace-existing="replaceExisting = $event"
          :committing="committing"
          @set-excluded="setExcluded"
          @start-editing="startEditing"
          @save="saveReviewedJob"
          @cancel-editing="cancelEditing"
          @request-commit="requestCommit"
          @commit="handleCommit"
          @cancel-confirmation="showConfirmation = false"
      />
    </template>
  </section>
</template>
