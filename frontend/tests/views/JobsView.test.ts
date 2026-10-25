import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import JobsView from '@/views/JobsView.vue';
import { getJobs } from '@/api/jobs';
import type { JobWithSkills } from '@/types/job';
import type { PaginatedJobs } from '@/schemas/job-list';

vi.mock('../../src/api/jobs', () => ({ getJobs: vi.fn() }));

const job: JobWithSkills = {
  id: 7, dateFound: '2026-10-01', company: 'Example Ltd', title: 'Backend Engineer',
  sourceUrl: 'https://example.com/job', originalText: null, location: 'Copenhagen',
  workModel: 'hybrid', employmentType: 'full_time', seniority: 'senior',
  primaryRole: null, yearsRequired: null, educationRequirement: null,
  languageRequirements: [], salaryRate: null, interest: 80,
  applyStatus: 'not_applied', gapNotes: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', skills: [],
};

function response(data: JobWithSkills[] = [job], page = 1, totalItems = data.length, pageSize: 10 | 25 | 50 = 25): PaginatedJobs {
  return { data: data.map(item => ({ ...item, matchPercentage: 87.5, assessmentCoverage: 75 })), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

async function setup(url = '/jobs') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/jobs', name: 'jobs', component: JobsView },
      { path: '/jobs/new', name: 'job-create', component: { template: '<div />' } },
      { path: '/jobs/import', name: 'job-import', component: { template: '<div />' } },
      { path: '/jobs/analyze', name: 'job-analyze', component: { template: '<div />' } },
      { path: '/jobs/:id', name: 'job-detail', component: { template: '<div />' } },
    ],
  });
  await router.push(url);
  await router.isReady();
  const wrapper = mount(JobsView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function changeSelect(wrapper: Awaited<ReturnType<typeof setup>>['wrapper'], label: string, value: string) {
  await wrapper.get(`select[aria-label="${label}"]`).setValue(value);
  await flushPromises();
}

describe('JobsView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getJobs).mockResolvedValue(response());
  });
  afterEach(() => { vi.useRealTimers(); });

  it('loads jobs and renders their details and links', async () => {
    const { wrapper } = await setup();
    expect(getJobs).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Example Ltd');
    expect(wrapper.text()).toContain('Backend Engineer');
    expect(wrapper.text()).toContain('80%');
    expect(wrapper.text()).toContain('87.5%');
    expect(wrapper.text()).toContain('75%');
    expect(wrapper.findAll('th').map(header => header.text())).not.toContain('Original match');
    expect(wrapper.find('option[value="originalMatch"]').exists()).toBe(false);
    expect(wrapper.get('a[href="https://example.com/job"]').attributes('rel')).toContain('noopener');
    expect(wrapper.get('a[href="/jobs/7"]').text()).toContain('Backend Engineer');
  });

  it('reads initial filters from the URL', async () => {
    const { wrapper } = await setup('/jobs?workModel=remote&sortBy=company&sortOrder=asc&page=2&pageSize=10');
    expect(getJobs).toHaveBeenCalledWith(expect.objectContaining({ workModel: 'remote', sortBy: 'company', sortOrder: 'asc', page: 2, pageSize: 10 }));
    expect((wrapper.get('select[aria-label="Work model"]').element as HTMLSelectElement).value).toBe('remote');
  });

  it('updates URL and resets page when filtering and sorting', async () => {
    const { wrapper, router } = await setup('/jobs?page=2');
    await changeSelect(wrapper, 'Work model', 'hybrid');
    expect(router.currentRoute.value.query).toEqual({ workModel: 'hybrid' });
    await changeSelect(wrapper, 'Sort by', 'company');
    expect(router.currentRoute.value.query).toEqual({ workModel: 'hybrid', sortBy: 'company' });
    expect(getJobs).toHaveBeenLastCalledWith(expect.objectContaining({ workModel: 'hybrid', sortBy: 'company', page: 1 }));
  });

  it('sorts by calculated match through the URL', async () => {
    const { wrapper, router } = await setup();
    await changeSelect(wrapper, 'Sort by', 'matchPercentage');
    expect(router.currentRoute.value.query.sortBy).toBe('matchPercentage');
    expect(getJobs).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'matchPercentage' }));
  });

  it('debounces search and writes the search term into the URL', async () => {
    const { wrapper, router } = await setup();
    vi.useFakeTimers();
    await wrapper.get('input[aria-label="Search jobs"]').setValue('  Laravel  ');
    expect(getJobs).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(299);
    expect(router.currentRoute.value.query.search).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    vi.useRealTimers();
    await flushPromises();
    expect(router.currentRoute.value.query.search).toBe('Laravel');
    expect(getJobs).toHaveBeenCalledTimes(2);
  });

  it('paginates and changes page size through the URL', async () => {
    vi.mocked(getJobs).mockResolvedValue(response([job], 1, 60));
    const { wrapper, router } = await setup();
    const next = wrapper.findAll('button').find(button => button.text() === 'Next');
    expect(next).toBeDefined();
    await next!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.page).toBe('2');
    await changeSelect(wrapper, 'Jobs per page', '10');
    expect(router.currentRoute.value.query.page).toBeUndefined();
    expect(router.currentRoute.value.query.pageSize).toBe('10');
  });

  it('shows an API error', async () => {
    vi.mocked(getJobs).mockRejectedValue(new Error('Network unavailable'));
    const { wrapper } = await setup();
    expect(wrapper.get('[role="alert"]').text()).toContain('Network unavailable');
  });

  it('shows the empty catalogue and empty search states', async () => {
    vi.mocked(getJobs).mockResolvedValue(response([]));
    const first = await setup();
    expect(first.wrapper.text()).toContain('No jobs yet');
    first.wrapper.unmount();
    const filtered = await setup('/jobs?search=nonexistent');
    expect(filtered.wrapper.text()).toContain('No matching jobs');
  });

  it('ignores stale responses when a newer request completes first', async () => {
    const older = deferred<PaginatedJobs>();
    const newer = deferred<PaginatedJobs>();
    vi.mocked(getJobs).mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const { wrapper, router } = await setup();
    await router.replace({ query: { workModel: 'remote' } });
    await flushPromises();
    newer.resolve(response([{ ...job, id: 8, company: 'New result' }]));
    await flushPromises();
    older.resolve(response([{ ...job, company: 'Stale result' }]));
    await flushPromises();
    expect(wrapper.text()).toContain('New result');
    expect(wrapper.text()).not.toContain('Stale result');
  });
});
