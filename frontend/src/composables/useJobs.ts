import { computed, ref, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getJobs } from '@/api/jobs';
import { jobListQuerySchema, type JobListQuery, type PaginatedJobs } from '@/schemas/job-list';
export function useJobs() {
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
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer); requestSequence++; });
return { route, filters, jobs, pagination, totalPages, startItem, endItem, loading, error, searchInput, updateFilters, setFilter, setPageSize, onSearch, resetFilters };
}
