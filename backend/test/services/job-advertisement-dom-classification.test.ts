import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    classifyHtmlJobAdvertisement,
    type ContentClassificationProvider,
} from '@/services/job-advertisement-dom-classification';

interface ModelInput {
    units: Array<{ id: number; text: string; context: string[]; previous?: { id: number; text: string }; next?: { id: number; text: string }; precedingHeading?: { id: number; text: string } }>;
}

function providerForRegions(): ContentClassificationProvider {
    return {
        async classifyContent(input: string) {
            const { units } = JSON.parse(input) as ModelInput;
            return { regions: units.map(unit => {
                const path = unit.context.join(' ');
                const role = path.includes('application-facts') ? 'metadata'
                    : path.includes('other-content') ? 'noise' : 'advertisement';
                return { id: unit.id, role };
            }) };
        },
    };
}

const example = `<!doctype html><html><body>
    <div class="main-ad">
      <h1>Fictional Backend Engineer</h1>
      <p>Build dependable TypeScript services for a fictional organization.</p>
      <div class="application-facts">
        <p>Deadline: 30 December 2026</p>
        <p>Contact: Sam Example</p>
      </div>
      <h2>Requirements</h2>
      <p>Experience with SQL, APIs, and automated tests is required.</p>
    </div>
    <div class="other-content"><p>Unrelated article about software trends.</p></div>
</body></html>`;

describe('Experimental DOM classification assembly (deterministic)', () => {
    it('supplies adjacent content and preceding headings without changing text', async () => {
        let received: ModelInput | undefined;
        await classifyHtmlJobAdvertisement(example, {
            classifyContent: async (input) => {
                received = JSON.parse(input) as ModelInput;
                return { regions: received.units.map(unit => ({ id: unit.id, role: 'advertisement' })) };
            },
        });
        const units = received!.units;
        const heading = units.find(unit => unit.text === 'Requirements')!;
        const paragraph = units.find(unit => unit.text.startsWith('Experience with SQL'))!;
        expect(paragraph.previous).toEqual({ id: heading.id, text: heading.text });
        expect(paragraph.precedingHeading).toEqual({ id: heading.id, text: heading.text });
        expect(heading.next).toEqual({ id: paragraph.id, text: paragraph.text });
    });

    it('retains separated advertisement sections without rewriting metadata or noise', async () => {
        const result = await classifyHtmlJobAdvertisement(example, providerForRegions());
        expect(result.advertisement).toContain('Fictional Backend Engineer');
        expect(result.advertisement).toContain('Build dependable TypeScript services');
        expect(result.advertisement).toContain('Experience with SQL, APIs');
        expect(result.advertisement.indexOf('Build dependable')).toBeLessThan(result.advertisement.indexOf('Experience with SQL'));
        expect(result.advertisement).not.toContain('Deadline:');
        expect(result.advertisement).not.toContain('Unrelated article');
        expect(result.metadataContext).toContain('Deadline: 30 December 2026');
        expect(result.metadataContext).toContain('Contact: Sam Example');
    });

    it('rejects references to nonexistent nodes', async () => {
        await expect(classifyHtmlJobAdvertisement(example, {
            classifyContent: async () => ({ regions: [{ id: 999999, role: 'advertisement' }] }),
        })).rejects.toThrow();
    });

    it('rejects duplicate role assignments for a node', async () => {
        await expect(classifyHtmlJobAdvertisement(example, {
            classifyContent: async (tree) => {
                const id = (JSON.parse(tree) as ModelInput).units[0]!.id;
                return { regions: [
                    { id, role: 'advertisement' },
                    { id, role: 'metadata' },
                ] };
            },
        })).rejects.toThrow();
    });


    it('rejects classifications that omit any text unit', async () => {
        await expect(classifyHtmlJobAdvertisement(example, {
            classifyContent: async (input) => {
                const { units } = JSON.parse(input) as ModelInput;
                return { regions: units.slice(0, -1).map(unit => ({ id: unit.id, role: 'advertisement' })) };
            },
        })).rejects.toThrow();
    });

    it('rejects classifying structural container IDs instead of text units', async () => {
        await expect(classifyHtmlJobAdvertisement(example, {
            classifyContent: async () => ({ regions: [{ id: 1, role: 'advertisement' }] }),
        })).rejects.toThrow();
    });

    it('keeps the existing JSON-LD path without making an AI call', async () => {
        const html = readFileSync(new URL('../fixtures/job-advertisements/07-encoded-jsonld.html', import.meta.url), 'utf8');
        const result = await classifyHtmlJobAdvertisement(html, {
            classifyContent: async () => { throw new Error('JSON-LD must not require AI classification'); },
        });
        expect(result.title).toBe('Backend Integration Developer');
        expect(result.advertisement).toContain('Develop PHP services, integrate PostgreSQL');
        expect(result.metadataContext).toContain('Fictional Employer Seven');
        expect(result.metadataContext).toContain('2026-12-31');
    });
});
