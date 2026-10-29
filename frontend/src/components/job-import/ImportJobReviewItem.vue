<script setup lang="ts">
import { jobSkillRequirementLabels } from '@/lib/job-labels';
import { categoryKey, normalizeSkillCategory } from '@/services/skill-category';
import { Button } from '@/components/ui/button';
import JobImportReviewForm from '@/components/JobImportReviewForm.vue';
import type { ReviewedJob, JobReviewStatus } from '@/services/job-import/reviewed-job';
import type { ImportedJob } from '@/schemas/job-import';
defineProps<{ reviewedJob: ReviewedJob; existingCategories: string[]; status: JobReviewStatus | undefined; index: number; busy: boolean; editing: boolean; savingJob: boolean }>();
const emit = defineEmits<{ acceptCategory: [category: string]; setExcluded: [excluded: boolean]; startEditing: []; save: [job: ImportedJob]; cancelEditing: [] }>();
function resolutionLabel(resolution: string): string {
  switch (resolution) {
    case 'existing': return 'Existing';
    case 'new': return 'New';
    case 'review_required': return 'Review required';
    default: return resolution;
  }
}

</script>

<template>
          <div
              
              
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
                                    emit('setExcluded', !($event.target as HTMLInputElement).checked)
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
                      v-else-if="!status?.valid"
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
                                            !status?.valid
                                        "
                      class="rounded-md border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <p class="mb-2 text-sm font-medium text-destructive">
                      Issues to resolve
                    </p>
                    <ul class="list-disc space-y-1 pl-5 text-sm text-destructive">
                      <li
                          v-for="(message, errorIndex) in status?.errors"
                          :key="errorIndex"
                      >
                        {{ message }}
                      </li>
                    </ul>
                  </div>

                  <template v-if="editing">
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
                          :existing-categories="existingCategories"
                          @save="emit('save', $event)"
                          @cancel="emit('cancelEditing')"
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
                          @click="emit('startEditing')"
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
                                                    ({{ normalizeSkillCategory(skill.category) }})
                                                </span>
                        <span
                          v-if="!existingCategories.some(category => categoryKey(category) === categoryKey(skill.category))"
                          class="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
                        >New category</span>
                        <Button
                          v-if="!reviewedJob.excluded && !busy &&
                            !existingCategories.some(category => categoryKey(category) === categoryKey(skill.category)) &&
                            !(reviewedJob.acceptedCategories ?? []).includes(categoryKey(skill.category))"
                          type="button" variant="outline" size="sm"
                          :aria-label="`Accept new category ${normalizeSkillCategory(skill.category)}`"
                          @click="emit('acceptCategory', skill.category)"
                        >Accept new category</Button>
                        <span v-else-if="(reviewedJob.acceptedCategories ?? []).includes(categoryKey(skill.category))" class="text-xs text-green-700">Accepted</span>
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
                        {{ jobSkillRequirementLabels[skill.requirement] }}
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
                              .map(requirement => jobSkillRequirementLabels[requirement as keyof typeof jobSkillRequirementLabels])
                              .join(', ')
                        }}
                      </p>
                    </div>
                  </template>
                </div>
              </details>
            </div>
          </div>
</template>
