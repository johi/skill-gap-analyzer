import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import JobDetailView from '../../src/views/JobDetailView.vue';
import { deleteJob, getJob } from '../../src/api/jobs';
import { ApiError } from '../../src/api/client';
import type { JobWithSkills } from '../../src/types/job';

const route = { params: { id: '7' } };
const push = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>();
  return {
    ...original,
    useRoute: () => route,
    useRouter: () => ({ push }),
  };
});

vi.mock('../../src/api/jobs', () => ({
  getJob: vi.fn(),
  deleteJob: vi.fn(),
}));

const job: JobWithSkills = {
  id: 7,
  title: 'Senior Backend Engineer',
  company: 'Example Company',
  dateFound: '2026-10-17',
  sourceUrl: null,
  originalText: null,
  location: 'Copenhagen',
  workModel: null,
  employmentType: null,
  seniority: null,
  primaryRole: null,
  yearsRequired: null,
  educationRequirement: null,
  languageRequirements: [],
  salaryRate: null,
  interest: 85,
  applyStatus: 'not_applied',
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  skills: [],
  contacts: [],
};

function mountView() {
  return mount(JobDetailView, {
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

describe('JobDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    route.params.id = '7';
    vi.mocked(getJob).mockResolvedValue(job);
    push.mockResolvedValue(undefined);
  });

  it('loads and renders job details', async () => {
    const wrapper = mountView();
    await flushPromises();
    expect(getJob).toHaveBeenCalledWith(7);
    expect(wrapper.text()).toContain('Senior Backend Engineer');
    expect(wrapper.text()).toContain('Example Company');
    expect(wrapper.text()).toContain('Position details');
    expect(wrapper.text()).toContain('No skills assigned');
  });

  it('renders all saved recruitment contacts with clickable email and phone links', async () => {
    vi.mocked(getJob).mockResolvedValue({
      ...job,
      contacts: [
        { id: 1, name: 'Anna Example', role: 'Recruiter', email: 'anna@example.com', phone: '+45 12345678' },
        { id: 2, name: 'Bo Example', role: null, email: 'bo@example.com', phone: null },
      ],
    });
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('Recruitment contacts');
    expect(wrapper.text()).toContain('Anna Example');
    expect(wrapper.text()).toContain('Recruiter');
    expect(wrapper.text()).toContain('Bo Example');
    expect(wrapper.find('a[href="mailto:anna@example.com"]').exists()).toBe(true);
    expect(wrapper.find('a[href="tel:+45 12345678"]').exists()).toBe(true);
  });

  it('rejects invalid IDs without requesting a job', async () => {
    route.params.id = 'invalid';
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('Invalid job ID');
    expect(getJob).not.toHaveBeenCalled();
  });

  it('displays a not-found message for HTTP 404', async () => {
    vi.mocked(getJob).mockRejectedValue(new ApiError(404, 'not_found', 'Missing'));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('Job not found');
  });

  it('displays other loading failures', async () => {
    vi.mocked(getJob).mockRejectedValue(new Error('Service unavailable'));
    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.text()).toContain('Service unavailable');
  });

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('button[data-variant="destructive"]').trigger('click');
    await flushPromises();
    expect(deleteJob).not.toHaveBeenCalled();
  });

  it('deletes and navigates when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    vi.mocked(deleteJob).mockResolvedValue(undefined);
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('button[data-variant="destructive"]').trigger('click');
    await flushPromises();
    expect(window.confirm).toHaveBeenCalledWith('Delete "Senior Backend Engineer" at Example Company?');
    expect(deleteJob).toHaveBeenCalledWith(7);
    expect(push).toHaveBeenCalledWith({ name: 'jobs' });
  });

  it('shows deletion errors without navigating', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    vi.mocked(deleteJob).mockRejectedValue(new Error('Deletion failed'));
    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('button[data-variant="destructive"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Deletion failed');
    expect(push).not.toHaveBeenCalled();
  });
});
