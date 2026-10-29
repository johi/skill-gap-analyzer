<script setup lang="ts">
import { BriefcaseBusiness, FileInput, Plus, Sparkles } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { useJobs } from '@/composables/useJobs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import JobListFilters from '@/components/jobs/JobListFilters.vue';
import JobListTable from '@/components/jobs/JobListTable.vue';
import SkillListControls from '@/components/ui/SkillListControls.vue';
import type { ListQuery } from '@/schemas/list-pagination';
import type { JobListQuery } from '@/schemas/job-list';
const { route, filters, jobs, pagination, loading, error, searchInput, updateFilters, setFilter, onSearch, resetFilters } = useJobs();
function updateList(changes: Partial<ListQuery>, reset: boolean): void {
  updateFilters(changes as Partial<JobListQuery>, reset);
}
function sortBy(key: 'dateFound' | 'applicationDeadline' | 'company' | 'interest' | 'matchPercentage'): void {
  const descending = filters.value.sortOrder === 'desc';
  updateFilters({sortBy: key, sortOrder: filters.value.sortBy === key
    ? (descending ? 'asc' : 'desc')
    : (key === 'company' ? 'asc' : 'desc')});
}
</script>
<template>

  <section class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Jobs</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Track job opportunities and compare their requirements with your skills.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" as-child>
          <RouterLink :to="{ name: 'job-analyze' }">
            <Sparkles class="size-4" /> Analyze advertisement
          </RouterLink>
        </Button>
        <Button variant="outline" as-child>
          <RouterLink :to="{ name: 'job-import' }">
            <FileInput class="size-4" /> Import jobs
          </RouterLink>
        </Button>
        <Button as-child>
          <RouterLink :to="{ name: 'job-create' }">
            <Plus class="size-4" /> Create job
          </RouterLink>
        </Button>
      </div>
    </div>

    <SkillListControls
      :query="filters"
      :pagination="!loading && !error ? pagination ?? null : null"
      :search-input="searchInput"
      item-label="jobs"
      search-label="Search jobs"
      search-placeholder="Company, title or location"
      @search="onSearch"
      @update="updateList"
    />

    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-lg bg-muted">
            <BriefcaseBusiness class="size-4" />
          </div>
          <div>
            <CardTitle>Job opportunities</CardTitle>
            <CardDescription>Search, filter and sort tracked opportunities.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-5">
        <JobListFilters :filters="filters" @filter="setFilter" @reset="resetFilters" />
<div v-if="loading" class="space-y-3" role="status" aria-label="Loading jobs">
          <Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" /><Skeleton class="h-10 w-full" />
        </div>
        <div v-else-if="error" class="rounded-md border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>
        <div v-else-if="jobs.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
          <BriefcaseBusiness class="mb-4 size-8 text-muted-foreground" />
          <h2 class="font-medium">{{ pagination?.totalItems === 0 && Object.keys(route.query).length === 0 ? 'No jobs yet' : 'No matching jobs' }}</h2>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            {{ pagination?.totalItems === 0 && Object.keys(route.query).length === 0 ? 'Add or import jobs to start tracking opportunities.' : 'Try adjusting your filters or selecting another page.' }}
          </p>
        </div>
        <JobListTable v-else :jobs="jobs" :sort-key="filters.sortBy" :sort-descending="filters.sortOrder === 'desc'" @sort="sortBy" />
      </CardContent>
    </Card>
  </section>
</template>
