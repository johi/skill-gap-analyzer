<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImportJobReviewItem from './ImportJobReviewItem.vue';
import ImportCommitConfirmation from './ImportCommitConfirmation.vue';
import type { ReviewedJob, JobReviewStatus } from '@/services/job-import/reviewed-job';
import type { ImportedJob } from '@/schemas/job-import';
defineProps<{ reviewedJobs: ReviewedJob[]; existingCategories: string[]; reviewStatuses: JobReviewStatus[]; busy: boolean; editingJobIndex: number | null; savingJob: boolean; includedCount: number; excludedCount: number; unresolvedJobCount: number; readyToImport: boolean; showConfirmation: boolean; committing: boolean; replaceExisting: boolean }>();
const emit = defineEmits<{ setExcluded: [index: number, excluded: boolean]; acceptCategory: [index: number, category: string]; startEditing: [index: number]; save: [index: number, job: ImportedJob]; cancelEditing: []; requestCommit: []; commit: []; cancelConfirmation: []; 'update:replaceExisting': [value: boolean] }>();
</script>

<template>
      <Card>
        <CardHeader>
          <CardTitle>Review jobs</CardTitle>
          <CardDescription>
            Include, exclude, or edit jobs before committing.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-3">
          <ImportJobReviewItem
              v-for="(reviewedJob, index) in reviewedJobs"
              :key="reviewedJob.jobIndex"
              :reviewed-job="reviewedJob"
              :existing-categories="existingCategories"
              :index="index"
              :status="reviewStatuses[index]"
              :busy="busy"
              :editing="editingJobIndex === index"
              :saving-job="savingJob"
              @set-excluded="emit('setExcluded', index, $event)"
              @accept-category="emit('acceptCategory', index, $event)"
              @start-editing="emit('startEditing', index)"
              @save="emit('save', index, $event)"
              @cancel-editing="emit('cancelEditing')"
          />

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
                  @click="emit('requestCommit')"
              >
                Commit reviewed import
              </Button>
            </div>

            <ImportCommitConfirmation
                v-if="showConfirmation"
                :included-count="includedCount"
                :excluded-count="excludedCount"
                :committing="committing"
                :replace-existing="replaceExisting"
                @update:replace-existing="emit('update:replaceExisting', $event)"
                :ready-to-import="readyToImport"
                @confirm="emit('commit')"
                @cancel="emit('cancelConfirmation')"
            />
          </div>
        </CardContent>
      </Card>
</template>
