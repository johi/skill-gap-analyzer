<script setup lang="ts">
import { applicationStatusLabels, employmentTypeLabels } from '@/lib/job-labels';
import { Button } from '@/components/ui/button';
import type { JobListQuery } from '@/schemas/job-list';

defineProps<{ filters: JobListQuery }>();
const emit = defineEmits<{
  filter: [key: 'workModel' | 'seniority' | 'employmentType' | 'applyStatus', value: string];
  reset: [];
}>();
const setFilter = (key: 'workModel' | 'seniority' | 'employmentType' | 'applyStatus', value: string) => emit('filter', key, value);
const resetFilters = () => emit('reset');
</script>
<template>
<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="space-y-1 text-sm">
            <span class="font-medium">Work model</span>
            <select aria-label="Work model" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.workModel ?? ''" @change="setFilter('workModel', ($event.target as HTMLSelectElement).value)">
              <option value="">All work models</option>
              <option value="onsite">Onsite</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Seniority</span>
            <select aria-label="Seniority" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.seniority ?? ''" @change="setFilter('seniority', ($event.target as HTMLSelectElement).value)">
              <option value="">All seniority levels</option>
              <option v-for="value in ['junior', 'mid', 'senior', 'lead', 'staff', 'principal']" :key="value" :value="value">{{ value }}</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Employment type</span>
            <select aria-label="Employment type" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.employmentType ?? ''" @change="setFilter('employmentType', ($event.target as HTMLSelectElement).value)">
              <option value="">All employment types</option>
              <option v-for="(label, value) in employmentTypeLabels" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Application status</span>
            <select aria-label="Application status" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.applyStatus ?? ''" @change="setFilter('applyStatus', ($event.target as HTMLSelectElement).value)">
              <option value="">All statuses</option>
              <option v-for="(label, value) in applicationStatusLabels" :key="value" :value="value">{{ label }}</option>
            </select>
          </label>
          <div class="flex items-end">
            <Button variant="outline" type="button" @click="resetFilters">Reset filters</Button>
          </div>
        </div>

</template>
