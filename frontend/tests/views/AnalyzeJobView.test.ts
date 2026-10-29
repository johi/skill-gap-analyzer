import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import AnalyzeJobView from '@/views/AnalyzeJobView.vue';
import { analyzeJobAdvertisement, analyzeJobAdvertisementUrl } from '@/api/job-analysis';
import { getSkills } from '@/api/skills';
import { createJob } from '@/api/jobs';
import { ApiError } from '@/api/client';
import type { JobAdvertisementAnalysis } from '@/schemas/job-analysis';

const push = vi.fn();
vi.mock('vue-router', async (importOriginal) => {
    const original = await importOriginal<typeof import('vue-router')>();
    return { ...original, useRouter: () => ({ push }) };
});
vi.mock('@/api/jobs', () => ({ createJob: vi.fn() }));
vi.mock('@/api/job-analysis', () => ({
    analyzeJobAdvertisement: vi.fn(),
    analyzeJobAdvertisementUrl: vi.fn(),
}));
vi.mock('@/api/skills', () => ({
    getSkills: vi.fn(),
}));

const advertisement = 'Example Company seeks a Senior TypeScript Developer for our Copenhagen office. Full-time employment.';
const analysis: JobAdvertisementAnalysis = {
    dateFound: '2026-10-21',
    originalText: advertisement,
    requiresReview: false,
    proposal: {
        company: 'Example Company', title: 'Senior TypeScript Developer',
        location: 'Copenhagen', workModel: null, employmentType: 'full_time',
        seniority: 'senior', primaryRole: null, yearsRequired: null,
        educationRequirement: null, languageRequirements: [], salaryRate: null,
        skills: [{ name: 'TypeScript', category: 'language', requirement: 'must_have' }],
    },
};

function mountView() {
    return mount(AnalyzeJobView, {
        global: {
            stubs: {
                RouterLink: { props: ['to'], template: '<a><slot /></a>' },
            },
        },
    });
}

beforeEach(() => {
    vi.resetAllMocks();
    push.mockResolvedValue(undefined);
    vi.mocked(createJob).mockResolvedValue({ id: 42 } as Awaited<ReturnType<typeof createJob>>);
    vi.mocked(analyzeJobAdvertisement).mockResolvedValue(analysis);
    vi.mocked(analyzeJobAdvertisementUrl).mockResolvedValue({ ...analysis, sourceUrl: 'https://careers.example.com/jobs/42' });
    vi.mocked(getSkills).mockResolvedValue([{ id: 1, name: 'TypeScript', category: 'Language', createdAt: '', updatedAt: '' }, { id: 2, name: 'Automated Testing', category: 'Testing', createdAt: '', updatedAt: '' }]);
});

describe('AnalyzeJobView (UC-09–11)', () => {
    it('disables analysis until enough text is supplied', async () => {
        const wrapper = mountView();
        // The action is identified by its visible label.
        const analyze = wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!;
        expect(analyze.attributes('disabled')).toBeDefined();
        await wrapper.get('textarea').setValue('Short');
        expect(analyze.attributes('disabled')).toBeDefined();
    });

    it('displays metadata and skills without saving a job', async () => {
        const wrapper = mountView();
        await wrapper.get('textarea').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(analyzeJobAdvertisement).toHaveBeenCalledWith(advertisement);
        expect(wrapper.text()).toContain('Example Company');
        expect(wrapper.text()).toContain('TypeScript');
        expect(wrapper.text()).toContain('Full-time');
        expect(wrapper.text()).toContain('Must have');
        expect(wrapper.text()).toContain('not saved');
        expect((wrapper.get('#job-advertisement').element as HTMLTextAreaElement).value).toBe('');
        expect((wrapper.get('#original-text').element as HTMLTextAreaElement).value).toBe(advertisement);
        expect(wrapper.get('#original-text').attributes('readonly')).toBeDefined();
        expect(createJob).not.toHaveBeenCalled();
    });

    it('shows errors without displaying an analysis', async () => {
        vi.mocked(analyzeJobAdvertisement).mockRejectedValue(new Error('provider unavailable'));
        const wrapper = mountView();
        await wrapper.get('textarea').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(wrapper.get('[role="alert"]').text()).toContain('Unable to analyze');
        expect(wrapper.text()).not.toContain('Extracted metadata');
        expect((wrapper.get('#job-advertisement').element as HTMLTextAreaElement).value).toBe(advertisement);
    });
});


describe('AnalyzeJobView (URL-first)', () => {
    it('analyzes a URL, clears the visible URL, and retains source URL and original text for review', async () => {
        const wrapper = mountView();
        const url = 'https://careers.example.com/jobs/42';
        await wrapper.get('#job-url').setValue(url);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze URL'))!.trigger('click');
        await flushPromises();
        expect(analyzeJobAdvertisementUrl).toHaveBeenCalledExactlyOnceWith(url);
        expect((wrapper.get('#job-url').element as HTMLInputElement).value).toBe('');
        expect((wrapper.get('#source-url').element as HTMLInputElement).value).toBe(url);
        expect((wrapper.get('#original-text').element as HTMLTextAreaElement).value).toBe(advertisement);
        await wrapper.get('form').trigger('submit');
        await wrapper.findAll('button').find(button => button.text().includes('Save approved job'))!.trigger('click');
        await flushPromises();
        expect(createJob).toHaveBeenCalledWith(expect.objectContaining({
            sourceUrl: url, originalText: advertisement,
        }));
    });

    it('preserves the URL on retrieval failure and allows manual paste fallback', async () => {
        vi.mocked(analyzeJobAdvertisementUrl).mockRejectedValueOnce(
            new ApiError(422, 'job_page_unavailable', 'The job website blocked retrieval. Paste the advertisement instead.')
        );
        const wrapper = mountView();
        await wrapper.get('#job-url').setValue('https://careers.example.com/jobs/42');
        await wrapper.findAll('button').find(button => button.text().includes('Analyze URL'))!.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('Paste the advertisement instead');
        expect((wrapper.get('#job-url').element as HTMLInputElement).value).toBe('https://careers.example.com/jobs/42');
        vi.mocked(analyzeJobAdvertisement).mockResolvedValueOnce({
            ...analysis, sourceUrl: 'https://careers.example.com/jobs/42',
        });
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(analyzeJobAdvertisement).toHaveBeenCalledExactlyOnceWith(advertisement, 'https://careers.example.com/jobs/42');
        expect((wrapper.get('#source-url').element as HTMLInputElement).value).toBe('https://careers.example.com/jobs/42');
        expect(wrapper.text()).toContain('Review and correct analysis');
    });
});

describe('AnalyzeJobView (LinkedIn manual import)', () => {
    it.each([
        ['https://www.linkedin.com/jobs/view/1234567890/', '1234567890'],
        ['https://www.linkedin.com/jobs/view/backend-engineer-1234567890/', '1234567890'],
        ['https://linkedin.com/jobs/search-results/?currentJobId=4484232425', '4484232425'],
        ['https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/9876543210', '9876543210'],
    ])('shows the manual job description link for %s without fetching LinkedIn', async (url, id) => {
        const wrapper = mountView();
        await wrapper.get('#job-url').setValue(url);
        const link = wrapper.get('a[href*="/jobs-guest/jobs/api/jobPosting/"]');
        expect(link.attributes('href')).toBe(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`);
        expect(link.attributes('target')).toBe('_blank');
        expect(link.attributes('rel')).toContain('noopener');
        expect(wrapper.text()).toContain('LinkedIn requires manual import');
        const button = wrapper.findAll('button').find(item => item.text().includes('Analyze URL'))!;
        expect(button.attributes('disabled')).toBeDefined();
        expect(analyzeJobAdvertisementUrl).not.toHaveBeenCalled();
    });

    it('supports manual text analysis while retaining the LinkedIn source URL', async () => {
        const url = 'https://www.linkedin.com/jobs/view/1234567890/';
        const wrapper = mountView();
        await wrapper.get('#job-url').setValue(url);
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        expect(analyzeJobAdvertisement).toHaveBeenCalledExactlyOnceWith(advertisement, url);
        expect(analyzeJobAdvertisementUrl).not.toHaveBeenCalled();
    });

    it('does not mistake similar hostnames for LinkedIn', async () => {
        const wrapper = mountView();
        await wrapper.get('#job-url').setValue('https://notlinkedin.com/jobs/view/1234567890');
        expect(wrapper.find('a[href*="/jobs-guest/jobs/api/jobPosting/"]').exists()).toBe(false);
        const button = wrapper.findAll('button').find(item => item.text().includes('Analyze URL'))!;
        expect(button.attributes('disabled')).toBeUndefined();
    });

    it('keeps manual paste available when the LinkedIn URL has no job ID', async () => {
        const wrapper = mountView();
        await wrapper.get('#job-url').setValue('https://www.linkedin.com/jobs/search/?keywords=developer');
        expect(wrapper.text()).toContain('Could not identify a job ID');
        expect(wrapper.find('a[href*="/jobs-guest/jobs/api/jobPosting/"]').exists()).toBe(false);
        const button = wrapper.findAll('button').find(item => item.text().includes('Analyze URL'))!;
        expect(button.attributes('disabled')).toBeDefined();
    });
});

describe('AnalyzeJobView (UC-12)', () => {
    async function analyzedView() {
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(item => item.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        return wrapper;
    }

    it('loads the existing catalogue and allows editing and approving without persisting', async () => {
        const wrapper = await analyzedView();
        expect(getSkills).toHaveBeenCalledOnce();
        expect((wrapper.get('#company').element as HTMLInputElement).value).toBe('Example Company');
        await wrapper.get('#company').setValue('Corrected Company');
        await wrapper.get('form').trigger('submit');
        await flushPromises();
        expect(wrapper.text()).toContain('Review approved — not saved');
        expect(wrapper.text()).toContain('Corrected Company');
        await wrapper.get('#title').setValue('Changed title');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
    });

    it('replaces an AI skill with an existing catalogue skill', async () => {
        const wrapper = await analyzedView();
        await wrapper.get('#skill-lookup-0').setValue('Automated');
        await wrapper.findAll('button').find(button => button.text().includes('Automated Testing'))!.trigger('click');
        expect((wrapper.get('#skill-name-0').element as HTMLInputElement).value).toBe('Automated Testing');
        expect((wrapper.get('#skill-category-0').element as HTMLInputElement).value).toBe('Testing');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
    });

    it('requires classification for uncertain AI skill requirements', async () => {
        vi.mocked(analyzeJobAdvertisement).mockResolvedValue({
            ...analysis,
            proposal: { ...analysis.proposal, skills: [{ name: 'Test Automation', category: 'Testing', requirement: null }] },
        });
        const wrapper = await analyzedView();
        expect((wrapper.get('#skill-requirement-0').element as HTMLSelectElement).value).toBe('');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
        await wrapper.get('#skill-requirement-0').setValue('nice_to_have');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
    });

    it('discards a proposal without persisting anything', async () => {
        const wrapper = await analyzedView();
        await wrapper.findAll('button').find(button => button.text().includes('Discard analysis'))!.trigger('click');
        expect(wrapper.text()).not.toContain('Review and correct analysis');
        expect((wrapper.get('#job-advertisement').element as HTMLTextAreaElement).value).toBe('');
    });

    it('blocks approval when the catalogue is unavailable and permits retry', async () => {
        vi.mocked(getSkills).mockRejectedValueOnce(new Error('offline'));
        const wrapper = await analyzedView();
        expect(wrapper.text()).toContain('Unable to load the skill catalogue');
        const submitButton = wrapper.get('form button[type="submit"]');
        expect(submitButton.attributes('disabled')).toBeDefined();
        await wrapper.findAll('button').find(button => button.text().includes('Retry loading skills'))!.trigger('click');
        await flushPromises();
        expect(wrapper.text()).not.toContain('Unable to load the skill catalogue');
        expect(submitButton.attributes('disabled')).toBeUndefined();
    });
});


describe('AnalyzeJobView (UC-13)', () => {
    async function analyzedView() {
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        return wrapper;
    }

    async function approve(wrapper: ReturnType<typeof mountView>) {
        await wrapper.get('form').trigger('submit');
        await flushPromises();
    }

    it('does not persist without explicit approval and save', async () => {
        const wrapper = await analyzedView();
        expect(createJob).not.toHaveBeenCalled();
        expect(wrapper.findAll('button').some(button => button.text().includes('Save approved job'))).toBe(false);
        await approve(wrapper);
        expect(createJob).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain('Save approved job');
    });

    it('persists the reviewed job with original advertisement and navigates to its details', async () => {
        const wrapper = await analyzedView();
        await wrapper.get('#company').setValue('Corrected Company');
        await approve(wrapper);
        await wrapper.findAll('button').find(button => button.text().includes('Save approved job'))!.trigger('click');
        await flushPromises();
        expect(createJob).toHaveBeenCalledOnce();
        expect(createJob).toHaveBeenCalledWith(expect.objectContaining({
            company: 'Corrected Company',
            originalText: advertisement,
            skills: [{ name: 'TypeScript', category: 'Language', requirement: 'must_have' }],
        }));
        expect(push).toHaveBeenCalledWith({ name: 'job-detail', params: { id: 42 } });
    });

    it('invalidates approval after editing and blocks saving until reapproved', async () => {
        const wrapper = await analyzedView();
        await approve(wrapper);
        await wrapper.get('#title').setValue('Changed title');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
        expect(wrapper.findAll('button').some(button => button.text().includes('Save approved job'))).toBe(false);
        expect(createJob).not.toHaveBeenCalled();
        await approve(wrapper);
        expect(wrapper.text()).toContain('Save approved job');
    });

    it('retains the approved data on API failure so the user can retry', async () => {
        vi.mocked(createJob).mockRejectedValueOnce(new ApiError(503, 'unavailable', 'Database unavailable'));
        const wrapper = await analyzedView();
        await approve(wrapper);
        const save = () => wrapper.findAll('button').find(button => button.text().includes('Save approved job'))!;
        await save().trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('Database unavailable');
        expect(wrapper.text()).toContain('Save approved job');
        expect(push).not.toHaveBeenCalled();
        await save().trigger('click');
        await flushPromises();
        expect(createJob).toHaveBeenCalledTimes(2);
        expect(push).toHaveBeenCalledWith({ name: 'job-detail', params: { id: 42 } });
    });

    it('shows backend validation errors without discarding the approved review', async () => {
        vi.mocked(createJob).mockRejectedValueOnce(new ApiError(400, 'validation_error', 'Invalid', [
            { path: 'sourceUrl', message: 'Invalid URL', code: 'invalid' },
        ]));
        const wrapper = await analyzedView();
        await approve(wrapper);
        await wrapper.findAll('button').find(button => button.text().includes('Save approved job'))!.trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('sourceUrl: Invalid URL');
        expect(wrapper.text()).toContain('Save approved job');
        expect(push).not.toHaveBeenCalled();
    });
});

describe('Browser-native review submission regression', () => {
    it('allows accepting an edited category with an empty catalogue using a real submit event', async () => {
        vi.mocked(getSkills).mockResolvedValue([]);
        vi.mocked(analyzeJobAdvertisement).mockResolvedValue({
            ...analysis,
            proposal: {
                ...analysis.proposal,
                skills: [{ name: 'PHP', category: 'Web Development', requirement: 'must_have' }],
            },
        });
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();

        await wrapper.get('#skill-category-0').setValue('Programming Language');
        await wrapper.get('button[aria-label="Accept new category Programming Language"]').trigger('click');
        (wrapper.get('form').element as HTMLFormElement).requestSubmit();
        await flushPromises();

        expect(wrapper.text()).toContain('Review approved — not saved');
        expect(createJob).not.toHaveBeenCalled();
    });

    it('shows a validation error rather than silently blocking a real submit event', async () => {
        vi.mocked(getSkills).mockResolvedValue([]);
        vi.mocked(analyzeJobAdvertisement).mockResolvedValue({
            ...analysis,
            proposal: {
                ...analysis.proposal,
                company: null,
                skills: [{ name: 'PHP', category: 'Web Development', requirement: 'must_have' }],
            },
        });
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();

        (wrapper.get('form').element as HTMLFormElement).requestSubmit();
        await flushPromises();

        expect(wrapper.text()).toContain('Enter the company before approving.');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
    });
});

describe('AI-proposed category review', () => {
    async function withNewCategory() {
        vi.mocked(analyzeJobAdvertisement).mockResolvedValue({
            ...analysis,
            requiresReview: true,
            proposal: {
                ...analysis.proposal,
                skills: [{ name: 'RabbitMQ', category: 'Messaging Systems', requirement: 'must_have' }],
            },
        });
        const wrapper = mountView();
        await wrapper.get('#job-advertisement').setValue(advertisement);
        await wrapper.findAll('button').find(button => button.text().includes('Analyze advertisement'))!.trigger('click');
        await flushPromises();
        return wrapper;
    }

    it('blocks approval until a new AI category is explicitly accepted', async () => {
        const wrapper = await withNewCategory();
        expect(wrapper.text()).toContain('New category: Messaging Systems');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Accept each new category');
        expect(wrapper.text()).not.toContain('Review approved — not saved');
        await wrapper.get('button[aria-label="Accept new category Messaging Systems"]').trigger('click');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
    });

    it('allows replacing a new AI category with an existing one', async () => {
        const wrapper = await withNewCategory();
        await wrapper.get('select[aria-label="Replace category for RabbitMQ"]').setValue('Testing');
        await wrapper.get('form').trigger('submit');
        expect(wrapper.text()).toContain('Review approved — not saved');
        await wrapper.findAll('button').find(button => button.text().includes('Save approved job'))!.trigger('click');
        await flushPromises();
        expect(createJob).toHaveBeenCalledWith(expect.objectContaining({
            skills: [{ name: 'RabbitMQ', category: 'Testing', requirement: 'must_have' }],
        }));
    });
});
