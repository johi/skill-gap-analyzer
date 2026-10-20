
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    flushPromises,
    mount,
} from '@vue/test-utils';

import ImportJobsView from '../../src/views/ImportJobsView.vue';
import JobImportReviewForm from '../../src/components/JobImportReviewForm.vue';

import {
    analyzeJobImport,
    commitJobImport,
} from '../../src/api/job-import';

import type {
    ImportedJob,
    JobDataset,
    JobImportAnalysis,
    JobImportCommitResponse,
} from '../../src/schemas/job-import';

vi.mock('../../src/api/job-import', () => ({
    analyzeJobImport: vi.fn(),
    commitJobImport: vi.fn(),
}));

const jobs: ImportedJob[] = [
    {
        dateFound: '2026-10-14',
        company: 'Alpha Technologies',
        title: 'Backend Developer',
        location: 'Copenhagen',
        languageRequirements: [],
        skills: [
            {
                name: 'TypeScript',
                category: 'language',
                requirement: 'must_have',
            },
        ],
    },
    {
        dateFound: '2026-10-14',
        company: 'Beta Systems',
        title: 'Fullstack Developer',
        location: 'Aarhus',
        languageRequirements: [],
        skills: [
            {
                name: 'Vue',
                category: 'framework',
                requirement: 'nice_to_have',
            },
        ],
    },
];

const dataset: JobDataset = {
    version: 1,
    jobs,
};

function makeAnalysis(
    sourceJobs: ImportedJob[] = jobs
): JobImportAnalysis {
    return {
        version: 1,
        totalJobs: sourceJobs.length,
        requiresReview: false,
        jobs: sourceJobs.map(job => ({
            job,
            skills: job.skills.map(skill => ({
                ...skill,
                resolution: 'new' as const,
                canonicalSkillId: null,
                canonicalName: skill.name,
            })),
        })),
    };
}

function makeConflictAnalysis(): JobImportAnalysis {
    const conflictingJob: ImportedJob = {
        ...jobs[0]!,
        skills: [
            {
                name: 'TypeScript',
                category: 'language',
                requirement: 'must_have',
            },
            {
                name: 'typescript',
                category: 'language',
                requirement: 'nice_to_have',
            },
        ],
    };

    return {
        version: 1,
        totalJobs: 2,
        requiresReview: true,
        jobs: [
            {
                job: conflictingJob,
                skills: conflictingJob.skills.map(skill => ({
                    ...skill,
                    resolution: 'review_required' as const,
                    canonicalSkillId: null,
                    canonicalName: 'TypeScript',
                    conflictingRequirements: [
                        'must_have',
                        'nice_to_have',
                    ],
                })),
            },
            makeAnalysis([jobs[1]!]).jobs[0]!,
        ],
    };
}

function mountView() {
    return mount(ImportJobsView, {
        global: {
            stubs: {
                RouterLink: {
                    props: ['to'],
                    template: '<a><slot /></a>',
                },
            },
        },
    });
}

function button(
    wrapper: ReturnType<typeof mountView>,
    label: string
) {
    const result = wrapper
        .findAll('button')
        .find(item => item.text().trim() === label);

    if (!result) {
        throw new Error(`Button "${label}" not found`);
    }

    return result;
}

async function selectDataset(
    wrapper: ReturnType<typeof mountView>,
    content: string = JSON.stringify(dataset)
): Promise<void> {
    const input = wrapper.get('input[type="file"]');

    const file = new File(
        [content],
        'sample.import.json',
        { type: 'application/json' }
    );

    Object.defineProperty(file, 'text', {
        value: async () => content,
    });

    Object.defineProperty(input.element, 'files', {
        configurable: true,
        value: [file],
    });

    await input.trigger('change');
    await flushPromises();
}

async function analyze(
    wrapper: ReturnType<typeof mountView>
): Promise<void> {
    await selectDataset(wrapper);
    await button(wrapper, 'Analyze dataset').trigger('click');
    await flushPromises();
}

async function excludeJob(
    wrapper: ReturnType<typeof mountView>,
    index: number
): Promise<void> {
    const checkbox = wrapper.get(
        `#include-job-${index}`
    );

    await checkbox.setValue(false);
    await flushPromises();
}

async function openJob(
    wrapper: ReturnType<typeof mountView>,
    index: number
): Promise<void> {
    const details = wrapper.findAll('details')[index];

    if (!details) {
        throw new Error(`Job ${index} not found`);
    }

    details.element.open = true;
    await details.trigger('toggle');
}

beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(analyzeJobImport)
        .mockResolvedValue(makeAnalysis());

    vi.mocked(commitJobImport)
        .mockResolvedValue({
            imported: 2,
            excluded: 0,
            jobIds: [101, 102],
        });
});

describe('ImportJobsView: dataset selection', () => {
    it('starts with analysis disabled', () => {
        const wrapper = mountView();

        expect(
            button(wrapper, 'Analyze dataset')
                .attributes('disabled')
        ).toBeDefined();
    });

    it('accepts a valid JSON dataset', async () => {
        const wrapper = mountView();

        await selectDataset(wrapper);

        expect(wrapper.text())
            .toContain('2 jobs in dataset');

        expect(
            button(wrapper, 'Analyze dataset')
                .attributes('disabled')
        ).toBeUndefined();
    });

    it('rejects invalid JSON', async () => {
        const wrapper = mountView();

        await selectDataset(wrapper, '{invalid json');

        expect(wrapper.text())
            .toContain(
                'The selected file does not contain valid JSON.'
            );

        expect(analyzeJobImport)
            .not.toHaveBeenCalled();
    });

    it('rejects an invalid dataset schema', async () => {
        const wrapper = mountView();

        await selectDataset(
            wrapper,
            JSON.stringify({
                version: 2,
                jobs,
            })
        );

        expect(wrapper.text())
            .toContain('Validation failed');

        expect(analyzeJobImport)
            .not.toHaveBeenCalled();
    });
});

describe('ImportJobsView: analysis', () => {
    it('analyzes the selected dataset', async () => {
        const wrapper = mountView();

        await analyze(wrapper);

        expect(analyzeJobImport)
            .toHaveBeenCalledWith(dataset);

        expect(wrapper.text())
            .toContain('Alpha Technologies');

        expect(wrapper.text())
            .toContain('Beta Systems');

        expect(wrapper.text())
            .toContain('Existing skills: 0');

        expect(wrapper.text())
            .toContain('New skills: 2');
    });

    it('displays analysis API errors', async () => {
        vi.mocked(analyzeJobImport)
            .mockRejectedValue(
                new Error('Analysis service unavailable')
            );

        const wrapper = mountView();

        await analyze(wrapper);

        expect(wrapper.text())
            .toContain('Analysis service unavailable');
    });

    it('blocks commit when a canonical skill conflict exists', async () => {
        vi.mocked(analyzeJobImport)
            .mockResolvedValue(makeConflictAnalysis());

        const wrapper = mountView();

        await analyze(wrapper);

        expect(wrapper.text())
            .toContain('Review required');

        expect(wrapper.text())
            .toContain('1 jobs require review');

        expect(
            button(wrapper, 'Commit reviewed import')
                .attributes('disabled')
        ).toBeDefined();
    });

    it('allows excluding a job with unresolved conflicts', async () => {
        vi.mocked(analyzeJobImport)
            .mockResolvedValue(makeConflictAnalysis());

        const wrapper = mountView();

        await analyze(wrapper);
        await excludeJob(wrapper, 0);

        expect(wrapper.text())
            .toContain('All included jobs are ready to import.');

        expect(
            button(wrapper, 'Commit reviewed import')
                .attributes('disabled')
        ).toBeUndefined();
    });
});

describe('ImportJobsView: review decisions', () => {
    it('updates included and excluded counts', async () => {
        const wrapper = mountView();

        await analyze(wrapper);
        await excludeJob(wrapper, 1);

        expect(wrapper.text())
            .toContain('1 jobs included');

        expect(wrapper.text())
            .toContain('1 excluded');
    });

    it('prevents commit when every job is excluded', async () => {
        const wrapper = mountView();

        await analyze(wrapper);

        await excludeJob(wrapper, 0);
        await excludeJob(wrapper, 1);

        expect(
            button(wrapper, 'Commit reviewed import')
                .attributes('disabled')
        ).toBeDefined();
    });

    it('re-analyzes an edited job', async () => {
        const wrapper = mountView();

        await analyze(wrapper);
        await openJob(wrapper, 0);

        await button(wrapper, 'Edit job').trigger('click');

        const form = wrapper.getComponent(
            JobImportReviewForm
        );

        const updatedJob: ImportedJob = {
            ...jobs[0]!,
            title: 'Senior Backend Developer',
            skills: [
                {
                    name: 'PostgreSQL',
                    category: 'database',
                    requirement: 'must_have',
                },
            ],
        };

        vi.mocked(analyzeJobImport)
            .mockResolvedValueOnce(
                makeAnalysis([updatedJob])
            );

        form.vm.$emit('save', updatedJob);

        await flushPromises();

        expect(analyzeJobImport)
            .toHaveBeenLastCalledWith({
                version: 1,
                jobs: [updatedJob],
            });

        expect(wrapper.text())
            .toContain('Senior Backend Developer');

        expect(wrapper.text())
            .toContain('PostgreSQL');
    });

    it('keeps the editor open when re-analysis fails', async () => {
        const wrapper = mountView();

        await analyze(wrapper);
        await openJob(wrapper, 0);

        await button(wrapper, 'Edit job').trigger('click');

        vi.mocked(analyzeJobImport)
            .mockRejectedValueOnce(
                new Error('Re-analysis failed')
            );

        wrapper
            .getComponent(JobImportReviewForm)
            .vm.$emit('save', jobs[0]!);

        await flushPromises();

        expect(wrapper.text())
            .toContain('Re-analysis failed');

        expect(
            wrapper.findComponent(JobImportReviewForm)
                .exists()
        ).toBe(true);
    });
});

describe('ImportJobsView: commit workflow', () => {
    it('shows confirmation before committing', async () => {
        const wrapper = mountView();

        await analyze(wrapper);

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        expect(wrapper.text())
            .toContain('Confirm import');

        expect(commitJobImport)
            .not.toHaveBeenCalled();
    });

    it('allows cancelling confirmation', async () => {
        const wrapper = mountView();

        await analyze(wrapper);

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        await button(wrapper, 'Cancel').trigger('click');

        expect(
            wrapper.text()
                .includes('You are about to import')
        ).toBe(false);

        expect(commitJobImport)
            .not.toHaveBeenCalled();
    });

    it('commits the original dataset and reviewed decisions', async () => {
        const wrapper = mountView();

        await analyze(wrapper);
        await excludeJob(wrapper, 1);

        vi.mocked(commitJobImport)
            .mockResolvedValue({
                imported: 1,
                excluded: 1,
                jobIds: [101],
            });

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        await button(
            wrapper,
            'Confirm import'
        ).trigger('click');

        await flushPromises();

        expect(commitJobImport)
            .toHaveBeenCalledWith(
                dataset,
                {
                    version: 1,
                    jobs: [
                        {
                            jobIndex: 0,
                            excluded: false,
                            job: jobs[0],
                        },
                        {
                            jobIndex: 1,
                            excluded: true,
                            job: jobs[1],
                        },
                    ],
                },
                false
            );

        expect(wrapper.text())
            .toContain('Import completed');

        expect(wrapper.text())
            .toContain('1 jobs imported');
    });

    it('passes true when replacing the existing job dataset', async () => {
        const wrapper = mountView();
        await analyze(wrapper);
        await button(wrapper, 'Commit reviewed import').trigger('click');

        const checkbox = wrapper.get('input[type="checkbox"]:not([id^="include-job-"])');
        await checkbox.setValue(true);
        expect(wrapper.text()).toContain('All existing jobs will be deleted');

        await button(wrapper, 'Confirm import').trigger('click');
        await flushPromises();

        expect(commitJobImport).toHaveBeenCalledWith(
            dataset,
            expect.objectContaining({ version: 1 }),
            true
        );
    });

    it('prevents duplicate submission after success', async () => {
        const wrapper = mountView();

        await analyze(wrapper);

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        await button(
            wrapper,
            'Confirm import'
        ).trigger('click');

        await flushPromises();

        expect(commitJobImport)
            .toHaveBeenCalledOnce();

        expect(
            wrapper.findAll('button')
                .some(item =>
                    item.text() === 'Confirm import'
                )
        ).toBe(false);
    });

    it('displays commit errors without reporting success', async () => {
        vi.mocked(commitJobImport)
            .mockRejectedValue(
                new Error('Database transaction failed')
            );

        const wrapper = mountView();

        await analyze(wrapper);

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        await button(
            wrapper,
            'Confirm import'
        ).trigger('click');

        await flushPromises();

        expect(wrapper.text())
            .toContain('Database transaction failed');

        expect(wrapper.text())
            .not.toContain('Import completed');
    });

    it('prevents a second commit while the first is pending', async () => {
        let resolveCommit!: (
            value: JobImportCommitResponse
        ) => void;

        vi.mocked(commitJobImport)
            .mockImplementation(
                () => new Promise(resolve => {
                    resolveCommit = resolve;
                })
            );

        const wrapper = mountView();

        await analyze(wrapper);

        await button(
            wrapper,
            'Commit reviewed import'
        ).trigger('click');

        await button(
            wrapper,
            'Confirm import'
        ).trigger('click');

        await flushPromises();

        expect(
            button(wrapper, 'Importing...')
                .attributes('disabled')
        ).toBeDefined();

        expect(commitJobImport)
            .toHaveBeenCalledOnce();

        resolveCommit({
            imported: 2,
            excluded: 0,
            jobIds: [101, 102],
        });

        await flushPromises();

        expect(commitJobImport)
            .toHaveBeenCalledOnce();

        expect(wrapper.text())
            .toContain('Import completed');
    });
});
