<script setup lang="ts">
import { computed } from 'vue';

import JobForm from '@/components/JobForm.vue';
import { Button } from '@/components/ui/button';

import type { CreateJobInput } from '@/types/job';
import type { ImportedJob } from '@/schemas/job-import';

const props = defineProps<{
  job: ImportedJob;
  existingCategories?: string[];
}>();

const emit = defineEmits<{
  save: [job: ImportedJob];
  cancel: [];
}>();

const formInitialValue = computed<CreateJobInput>(() => ({
  dateFound: props.job.dateFound,
  company: props.job.company,
  title: props.job.title,
  sourceUrl: props.job.sourceUrl ?? null,
  originalText: props.job.originalText ?? null,
  location: props.job.location ?? null,
  workModel: props.job.workModel ?? null,
  employmentType: props.job.employmentType ?? null,
  seniority: props.job.seniority ?? null,
  primaryRole: props.job.primaryRole ?? null,
  yearsRequired: props.job.yearsRequired ?? null,
  educationRequirement: props.job.educationRequirement ?? null,
  languageRequirements: props.job.languageRequirements,
  salaryRate: props.job.salaryRate ?? null,
  interest: props.job.interest ?? null,
  applyStatus: props.job.applyStatus ?? null,
  gapNotes: props.job.gapNotes ?? null,
  skills: props.job.skills,
}));

function handleSubmit(input: CreateJobInput): void {
  emit('save', input);
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button
          type="button"
          variant="outline"
          @click="emit('cancel')"
      >
        Cancel editing
      </Button>
    </div>

    <JobForm
        :initial-value="formInitialValue"
        :category-review="true"
        :category-options="existingCategories ?? []"
        submit-label="Save changes"
        @submit="handleSubmit"
    />
  </div>
</template>
