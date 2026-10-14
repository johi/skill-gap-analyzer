<script setup lang="ts">
import { BriefcaseBusiness, ExternalLink, FileInput, Plus } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { getJobs } from '@/api/jobs';
import {
  jobListQuerySchema,
  type JobListQuery,
  type PaginatedJobs,
} from '@/schemas/job-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const route = useRoute();
const router = useRouter();
const result = ref<PaginatedJobs | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const searchInput = ref('');
let requestSequence = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const defaults = jobListQuerySchema.parse({});
const first = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

function readQuery(): JobListQuery {
  const raw = {
    search: first(route.query.search) ?? '',
    workModel: first(route.query.workModel),
    seniority: first(route.query.seniority),
    employmentType: first(route.query.employmentType),
    applyStatus: first(route.query.applyStatus),
    sortBy: first(route.query.sortBy),
    sortOrder: first(route.query.sortOrder),
    page: Number(first(route.query.page) ?? 1),
    pageSize: Number(first(route.query.pageSize) ?? 25),
  };
  const parsed = jobListQuerySchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Discard invalid URL parameters individually rather than breaking the page.
  const safe: Record<string, unknown> = { ...raw };
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0]);
    delete safe[key];
  }
  return jobListQuerySchema.parse(safe);
}

const filters = computed(readQuery);
const jobs = computed(() => result.value?.data ?? []);
const pagination = computed(() => result.value?.pagination);
const totalPages = computed(() => pagination.value?.totalPages ?? 0);
const startItem = computed(() => pagination.value?.totalItems
  ? (pagination.value.page - 1) * pagination.value.pageSize + 1 : 0);
const endItem = computed(() => pagination.value
  ? Math.min(pagination.value.page * pagination.value.pageSize, pagination.value.totalItems) : 0);

function toRouteQuery(query: JobListQuery): Record<string, string> {
  const output: Record<string, string> = {};
  if (query.search) output.search = query.search;
  if (query.workModel) output.workModel = query.workModel;
  if (query.seniority) output.seniority = query.seniority;
  if (query.employmentType) output.employmentType = query.employmentType;
  if (query.applyStatus) output.applyStatus = query.applyStatus;
  if (query.sortBy !== defaults.sortBy) output.sortBy = query.sortBy;
  if (query.sortOrder !== defaults.sortOrder) output.sortOrder = query.sortOrder;
  if (query.page !== defaults.page) output.page = String(query.page);
  if (query.pageSize !== defaults.pageSize) output.pageSize = String(query.pageSize);
  return output;
}

function updateFilters(changes: Partial<JobListQuery>, resetPage = true): void {
  const next = jobListQuerySchema.parse({
    ...filters.value,
    ...changes,
    page: resetPage ? 1 : (changes.page ?? filters.value.page),
  });
  void router.replace({ query: toRouteQuery(next) });
}

function setFilter(key: 'workModel' | 'seniority' | 'employmentType' | 'applyStatus', value: string): void {
  updateFilters({ [key]: value || undefined });
}

function setPageSize(value: string): void {
  updateFilters({ pageSize: Number(value) as JobListQuery['pageSize'] });
}

function onSearch(value: string): void {
  searchInput.value = value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (searchInput.value.trim() !== filters.value.search) {
      updateFilters({ search: searchInput.value.trim() });
    }
  }, 300);
}

function resetFilters(): void {
  if (searchTimer) clearTimeout(searchTimer);
  searchInput.value = '';
  void router.replace({ query: {} });
}

watch(
  filters,
  async (query) => {
    if (searchTimer) clearTimeout(searchTimer);
    searchInput.value = query.search;
    const sequence = ++requestSequence;
    loading.value = true;
    error.value = null;
    try {
      const response = await getJobs(query);
      if (sequence === requestSequence) result.value = response;
    } catch (err) {
      if (sequence === requestSequence) {
        result.value = null;
        error.value = err instanceof Error ? err.message : 'Unable to load jobs';
      }
    } finally {
      if (sequence === requestSequence) loading.value = false;
    }
  },
  { immediate: true },
);
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
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label class="space-y-1 text-sm">
            <span class="font-medium">Search</span>
            <input
              aria-label="Search jobs"
              class="w-full rounded-md border bg-background px-3 py-2"
              :value="searchInput"
              placeholder="Company, title or location"
              maxlength="255"
              @input="onSearch(($event.target as HTMLInputElement).value)"
            />
          </label>
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
              <option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="temporary">Temporary</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Application status</span>
            <select aria-label="Application status" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.applyStatus ?? ''" @change="setFilter('applyStatus', ($event.target as HTMLSelectElement).value)">
              <option value="">All statuses</option>
              <option v-for="value in ['not_applied', 'applied', 'interview', 'rejected', 'offer', 'expired']" :key="value" :value="value">{{ value.replaceAll('_', ' ') }}</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Sort by</span>
            <select aria-label="Sort by" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.sortBy" @change="updateFilters({ sortBy: ($event.target as HTMLSelectElement).value as JobListQuery['sortBy'] })">
              <option value="dateFound">Date found</option><option value="company">Company</option><option value="interest">Interest</option><option value="originalMatch">Original match</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Sort direction</span>
            <select aria-label="Sort direction" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.sortOrder" @change="updateFilters({ sortOrder: ($event.target as HTMLSelectElement).value as JobListQuery['sortOrder'] })">
              <option value="desc">Descending</option><option value="asc">Ascending</option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span class="font-medium">Jobs per page</span>
            <select aria-label="Jobs per page" class="w-full rounded-md border bg-background px-3 py-2" :value="filters.pageSize" @change="setPageSize(($event.target as HTMLSelectElement).value)">
              <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option>
            </select>
          </label>
          <div class="flex items-end">
            <Button variant="outline" type="button" @click="resetFilters">Reset filters</Button>
          </div>
        </div>

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
        <div v-else class="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Company</TableHead><TableHead>Title</TableHead>
              <TableHead>Location</TableHead><TableHead>Interest</TableHead><TableHead>Match</TableHead>
              <TableHead>Status</TableHead><TableHead>Ad</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="job in jobs" :key="job.id">
                <TableCell class="whitespace-nowrap text-muted-foreground">{{ job.dateFound }}</TableCell>
                <TableCell class="font-medium">{{ job.company }}</TableCell>
                <TableCell>
                  <RouterLink class="font-medium hover:underline" :to="{ name: 'job-detail', params: { id: job.id } }">{{ job.title }}</RouterLink>
                </TableCell>
                <TableCell>{{ job.location ?? '—' }}</TableCell>
                <TableCell><Badge v-if="job.interest !== null" variant="secondary">{{ job.interest }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge v-if="job.originalMatch !== null" variant="secondary">{{ job.originalMatch }}%</Badge><span v-else>—</span></TableCell>
                <TableCell><Badge v-if="job.applyStatus" variant="outline">{{ job.applyStatus.replaceAll('_', ' ') }}</Badge><span v-else>—</span></TableCell>
                <TableCell>
                  <a v-if="job.sourceUrl" :href="job.sourceUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-sm underline" :aria-label="`Open original advertisement for ${job.title}`">
                    Open <ExternalLink class="size-3" />
                  </a><span v-else class="text-muted-foreground">—</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="!loading && !error && pagination" class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p class="text-sm text-muted-foreground">
            Showing {{ startItem }}–{{ endItem }} of {{ pagination.totalItems }} jobs
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="filters.page <= 1" @click="updateFilters({ page: filters.page - 1 }, false)">Previous</Button>
            <span class="text-sm">Page {{ filters.page }} of {{ totalPages }}</span>
            <Button variant="outline" size="sm" :disabled="filters.page >= totalPages" @click="updateFilters({ page: filters.page + 1 }, false)">Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
