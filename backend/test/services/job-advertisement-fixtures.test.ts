import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { classifyHtmlJobAdvertisement } from '@/services/job-advertisement-dom-classification';
import { OpenAiJobAnalysisProvider } from '@/services/openai-job-analysis-provider';

/**
 * Acceptance tests for separating advertisement prose from supplementary facts.
 * All fixture contents are fictional. These are live AI acceptance tests only. Set
 * RUN_LIVE_HTML_CLASSIFICATION=1 to run them (requires an API key).
 *
 * Contract: "advertisement" becomes the stored originalText, while
 * "metadataContext" supplies additional facts for structured analysis.
 * Neither value should contain unrelated site content.
 */
interface ExpectedPage {
    file: string;
    advertisementInOrder: string[];
    metadataIncludes: string[];
    advertisementExcludes: string[];
    everywhereExcludes: string[];
    title?: string | null;
}

const cases: ExpectedPage[] = [
    {
        file: '01-semantic-article.html',
        advertisementInOrder: [
            'Backend Developer',
            'building an internal scheduling system',
            'Design and maintain APIs using PHP and Symfony.',
            'Improve PostgreSQL queries',
            'You have professional PHP experience',
            'A permanent full-time position',
            'Send an application through the careers form.',
        ],
        metadataIncludes: [
            'North District',
            '15 December 2026',
            'Alex Example',
            'Recruitment Coordinator',
            'alex@example.test',
        ],
        advertisementExcludes: ['Quick facts', '15 December 2026', 'alex@example.test'],
        everywhereExcludes: ['Cookie choices', 'Site map', 'About', 'Careers'],
    },
    {
        file: '02-interleaved-siblings.html',
        advertisementInOrder: [
            'Full-stack Developer',
            'coordinating fictional community workshops',
            'We value clear communication',
            'What you will build',
            'Develop TypeScript services, Vue interfaces',
            'Requirements',
            'Experience with JavaScript or TypeScript',
            'Explain one system you helped improve',
        ],
        metadataIncludes: [
            '30 November 2026',
            '37 hours weekly',
            'Robin Sample',
            '+45 12 34 56 78',
        ],
        advertisementExcludes: ['Position facts', '30 November 2026', 'Robin Sample'],
        everywhereExcludes: ['Share this vacancy', 'Newsletter', 'Accessibility', 'Sign in'],
    },
    {
        file: '03-nested-metadata.html',
        advertisementInOrder: [
            'Platform Engineer',
            'simulated research platform',
            'Responsibilities',
            'Maintain containerized services and Kubernetes configurations.',
            'Build CI/CD pipelines',
            'Qualifications',
            'Comfort with Linux, Docker',
            'Employment',
            'The role is full-time',
        ],
        metadataIncludes: [
            '8 January 2027',
            'Taylor Example',
            'taylor@example.test',
        ],
        advertisementExcludes: ['Application facts', '8 January 2027', 'taylor@example.test'],
        everywhereExcludes: [
            'Print vacancy', 'Share', 'You might also like: Junior Designer',
            'Legal notices', 'General support',
        ],
    },
    {
        file: '04-deep-uneven-nesting.html',
        advertisementInOrder: [
            'Software Developer — Data Services',
            'virtual archive for invented geological specimens',
            'The work',
            'Implement REST APIs',
            'Experience',
            'You understand SQL, automated testing',
            'Applications must be submitted in English.',
        ],
        metadataIncludes: [
            '22 December 2026',
            'Morgan Sample',
            'morgan@example.test',
            'River Quarter',
        ],
        advertisementExcludes: ['22 December 2026', 'morgan@example.test'],
        everywhereExcludes: ['Browse other roles', 'Social links', 'Cookie settings'],
    },
    {
        file: '05-scattered-metadata.html',
        advertisementInOrder: [
            'Senior API Developer',
            'imaginary logistics simulations',
            'Your tasks',
            'Develop Symfony services, integrate RabbitMQ events',
            'What we are looking for',
            'Strong PHP experience',
            'Send your application with a short technical summary.',
        ],
        metadataIncludes: [
            '6 February 2027',
            'Full-time',
            'Casey Example',
            'Recruitment Specialist',
            'casey@example.test',
            'Jamie Sample',
            'Engineering Coordinator',
            '+45 11 22 33 44',
        ],
        advertisementExcludes: [
            'Application deadline:', 'Questions about the hiring process:',
            'casey@example.test', 'Jamie Sample',
        ],
        everywhereExcludes: [
            'Featured opportunities', 'Create job alert', 'Subscribe to updates',
            'Manage cookies',
        ],
    },
    {
        file: '06-competing-dense-regions.html',
        advertisementInOrder: [
            'Security Software Engineer',
            'imaginary security training sandbox',
            'Role',
            'Build TypeScript and Python services',
            'Requirements',
            'Professional programming experience',
            'How to apply',
            'Submit a CV and examples of technical work',
        ],
        metadataIncludes: [
            '19 January 2027',
            'Drew Example',
            'drew@example.test',
            'East Borough',
        ],
        advertisementExcludes: ['Vacancy facts', '19 January 2027', 'drew@example.test'],
        everywhereExcludes: [
            'From our publication', 'fictional knowledge magazine',
            'long overview of software engineering trends', 'Newsletter topics',
            'Reader resources', 'Discover tutorials', 'View all jobs',
        ],
    },
    {
        file: '07-encoded-jsonld.html',
        advertisementInOrder: [
            'Backend Integration Developer',
            'simulated reservation platform for imaginary museum exhibitions',
            'What you will do',
            'Develop PHP services, integrate PostgreSQL',
            'Write clear tests and review changes with teammates.',
            'What you bring',
            'Experience with Symfony or Laravel',
            'structured professional development.',
        ],
        metadataIncludes: ['Fictional Employer Seven', '2026-12-31'],
        advertisementExcludes: ['2026-12-31', 'validThrough', 'hiringOrganization'],
        everywhereExcludes: [
            'Unrelated vacancy: Product Writer', 'Jobs | Events | Login',
            'Privacy | Careers | Newsletter',
        ],
        title: 'Backend Integration Developer',
    },
];

function loadFixture(file: string): string {
    return readFileSync(new URL(`../fixtures/job-advertisements/${file}`, import.meta.url), 'utf8');
}

function expectInOrder(text: string, fragments: string[]): void {
    let previous = -1;
    for (const fragment of fragments) {
        const index = text.indexOf(fragment, previous + 1);
        expect(index, `Missing or out of order: ${JSON.stringify(fragment)}`).toBeGreaterThan(previous);
        previous = index;
    }
}

const liveClassification = process.env.RUN_LIVE_HTML_CLASSIFICATION === '1';

(liveClassification ? describe : describe.skip)('Fictional HTML job-advertisement fixtures (live AI acceptance)', () => {
    for (const scenario of cases) {
        describe(scenario.file, () => {
            let result!: { advertisement: string; title: string | null; metadataContext?: string };
            let advertisement!: string;
            let metadataContext: unknown;

            beforeAll(async () => {
                const html = loadFixture(scenario.file);
                result = await classifyHtmlJobAdvertisement(html, new OpenAiJobAnalysisProvider());
                advertisement = result.advertisement;
                metadataContext = result.metadataContext;
            }, 120_000);

            it('retains all job advertisement sections in source order, without rewriting', () => {
                expectInOrder(advertisement, scenario.advertisementInOrder);
            });

            it('removes supplementary facts from the stored advertisement', () => {
                for (const text of scenario.advertisementExcludes) {
                    expect(advertisement, `Unexpected advertisement text: ${JSON.stringify(text)}`)
                        .not.toContain(text);
                }
            });

            it('retains facts in a separate metadata context', () => {
                expect(metadataContext, 'The extractor must expose a metadataContext string')
                    .toEqual(expect.any(String));
                for (const text of scenario.metadataIncludes) {
                    expect(metadataContext).toContain(text);
                }
            });

            it('excludes website noise from both advertisement and metadata', () => {
                for (const text of scenario.everywhereExcludes) {
                    expect(advertisement).not.toContain(text);
                    if (typeof metadataContext === 'string') {
                        expect(metadataContext).not.toContain(text);
                    }
                }
            });

            if (scenario.title !== undefined) {
                it('preserves the structured job title', () => {
                    expect(result.title).toBe(scenario.title);
                });
            }
        });
    }
});
