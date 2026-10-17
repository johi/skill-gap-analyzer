import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CreateJobView from '../../src/views/CreateJobView.vue';
import EditJobView from '../../src/views/EditJobView.vue';
import { createJob, getJob, updateJob } from '../../src/api/jobs';
import { ApiError } from '../../src/api/client';
import type { CreateJobInput, JobWithSkills } from '../../src/types/job';

const route = { params: { id: '7' } };
const push = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>();
  return { ...original, useRoute: () => route, useRouter: () => ({ push }) };
});
vi.mock('../../src/api/jobs', () => ({
  createJob: vi.fn(), getJob: vi.fn(), updateJob: vi.fn(),
}));

const job = { id: 7, title: 'Backend Engineer', company: 'Example' } as JobWithSkills;
const input = { title: 'Backend Engineer', company: 'Example' } as CreateJobInput;
const stubs = {
  RouterLink: { template: '<a><slot /></a>' },
  JobForm: { props: ['initialValue', 'submitting', 'submitLabel'], emits: ['submit'], template: '<button class="mock-submit" @click="$emit(\'submit\', { title: \'Backend Engineer\', company: \'Example\' })">Submit mock</button>' },
};
function mountCreate() { return mount(CreateJobView, { global: { stubs } }); }
function mountEdit() { return mount(EditJobView, { global: { stubs } }); }
async function submit(wrapper: ReturnType<typeof mountCreate>) {
  await wrapper.get('.mock-submit').trigger('click');
  await flushPromises();
}

beforeEach(() => {
  vi.resetAllMocks();
  route.params.id = '7';
  push.mockResolvedValue(undefined);
  vi.mocked(getJob).mockResolvedValue(job);
  vi.mocked(createJob).mockResolvedValue(job);
  vi.mocked(updateJob).mockResolvedValue(job);
});

describe('CreateJobView', () => {
  it('creates a job and navigates to its detail', async () => {
    const wrapper = mountCreate();
    await submit(wrapper);
    expect(createJob).toHaveBeenCalledWith(input);
    expect(push).toHaveBeenCalledWith({ name: 'job-detail', params: { id: 7 } });
  });
  it('displays validation issues without navigating', async () => {
    vi.mocked(createJob).mockRejectedValue(new ApiError(400, 'validation_error', 'Invalid', [{ path: 'title', message: 'Required', code: 'invalid' }]));
    const wrapper = mountCreate();
    await submit(wrapper);
    expect(wrapper.text()).toContain('title: Required');
    expect(push).not.toHaveBeenCalled();
  });
  it('displays general API failures and keeps the form', async () => {
    vi.mocked(createJob).mockRejectedValue(new Error('Create failed'));
    const wrapper = mountCreate();
    await submit(wrapper);
    expect(wrapper.text()).toContain('Create failed');
    expect(wrapper.find('.mock-submit').exists()).toBe(true);
  });
});

describe('EditJobView', () => {
  it('loads, updates and navigates to the detail', async () => {
    const wrapper = mountEdit();
    await flushPromises();
    expect(getJob).toHaveBeenCalledWith(7);
    await submit(wrapper);
    expect(updateJob).toHaveBeenCalledWith(7, input);
    expect(push).toHaveBeenCalledWith({ name: 'job-detail', params: { id: 7 } });
  });
  it('keeps the form visible after a failed update', async () => {
    vi.mocked(updateJob).mockRejectedValue(new Error('Update failed'));
    const wrapper = mountEdit();
    await flushPromises();
    await submit(wrapper);
    expect(wrapper.text()).toContain('Update failed');
    expect(wrapper.find('.mock-submit').exists()).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });
  it('displays update validation issues', async () => {
    vi.mocked(updateJob).mockRejectedValue(new ApiError(400, 'validation_error', 'Invalid', [{ path: 'company', message: 'Required', code: 'invalid' }]));
    const wrapper = mountEdit();
    await flushPromises();
    await submit(wrapper);
    expect(wrapper.text()).toContain('company: Required');
    expect(wrapper.find('.mock-submit').exists()).toBe(true);
  });
  it('rejects invalid IDs without loading', async () => {
    route.params.id = 'bad';
    const wrapper = mountEdit();
    await flushPromises();
    expect(wrapper.text()).toContain('Invalid job ID');
    expect(getJob).not.toHaveBeenCalled();
  });
  it('displays a not-found loading error', async () => {
    vi.mocked(getJob).mockRejectedValue(new ApiError(404, 'not_found', 'Missing'));
    const wrapper = mountEdit();
    await flushPromises();
    expect(wrapper.text()).toContain('Job not found');
    expect(wrapper.find('.mock-submit').exists()).toBe(false);
  });
});
