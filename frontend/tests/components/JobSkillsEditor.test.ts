import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import JobForm from '../../src/components/JobForm.vue';

const base = { dateFound: '2026-11-18', company: 'Example', title: 'Engineer', languageRequirements: [] };

function mountReview(skill: { name: string; category: string; requirement: 'must_have' | 'nice_to_have' | '' }, catalogue: any[] = []) {
  return mount(JobForm, {
    props: {
      reviewMode: true,
      skillCatalogue: catalogue,
      initialValue: { ...base, skills: [skill] } as any,
    },
  });
}

describe('JobForm skill editor regression', () => {
  it('requires explicit acceptance of a new category before submission', async () => {
    const wrapper = mountReview({ name: 'Novel skill', category: 'Novel category', requirement: 'must_have' });
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    await wrapper.get('button[aria-label="Accept new category Novel Category"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('replaces an extracted skill with a catalogue skill', async () => {
    const catalogue = [{ id: 1, name: 'TypeScript', category: 'Programming Languages' }];
    const wrapper = mountReview({ name: 'Unknown', category: 'Unknown category', requirement: 'must_have' }, catalogue);
    await wrapper.get('input[type="search"]').setValue('TypeScript');
    await wrapper.get('button[aria-label="Use existing skill TypeScript"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    expect((wrapper.emitted('submit')?.[0]?.[0] as any).skills[0]).toMatchObject({ name: 'TypeScript', category: 'Programming Languages' });
  });

  it('rejects an unclassified skill requirement', async () => {
    const wrapper = mountReview({ name: 'TypeScript', category: 'Programming Languages', requirement: '' });
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.text()).toContain('Classify every skill');
  });
});
