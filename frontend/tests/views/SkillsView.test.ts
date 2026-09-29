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

import SkillsView from '../../src/views/SkillsView.vue';

import {
    createSkill,
    deleteSkill,
    getSkills,
    updateSkill,
} from '../../src/api/skills';

vi.mock('../../src/api/skills', () => ({
    getSkills: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
}));

const skills = [
    {
        id: 1,
        name: 'TypeScript',
        category: 'language',
        createdAt: '2026-09-29T10:00:00.000Z',
        updatedAt: '2026-09-29T10:00:00.000Z',
    },
    {
        id: 2,
        name: 'PostgreSQL',
        category: 'database',
        createdAt: '2026-09-29T10:00:00.000Z',
        updatedAt: '2026-09-29T10:00:00.000Z',
    },
];

describe('SkillsView', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(getSkills)
            .mockResolvedValue(skills);
    });

    it('loads and displays skills', async () => {
        const wrapper = mount(SkillsView);

        await flushPromises();

        expect(getSkills).toHaveBeenCalledOnce();

        expect(wrapper.text()).toContain('TypeScript');
        expect(wrapper.text()).toContain('language');
        expect(wrapper.text()).toContain('PostgreSQL');
        expect(wrapper.text()).toContain('database');
    });

    it('creates a skill', async () => {
        vi.mocked(createSkill).mockResolvedValue({
            id: 3,
            name: 'Vue',
            category: 'framework',
            createdAt: '2026-09-29T11:00:00.000Z',
            updatedAt: '2026-09-29T11:00:00.000Z',
        });

        const wrapper = mount(SkillsView);

        await flushPromises();

        const inputs = wrapper.findAll('input');

        await inputs[0].setValue('Vue');
        await inputs[1].setValue('framework');

        await wrapper.get('form').trigger('submit');

        await flushPromises();

        expect(createSkill).toHaveBeenCalledWith({
            name: 'Vue',
            category: 'framework',
        });

        expect(wrapper.text()).toContain('Vue');
        expect(wrapper.text()).toContain('framework');
    });

    it('updates a skill', async () => {
        vi.mocked(updateSkill).mockResolvedValue({
            ...skills[0],
            name: 'JavaScript',
        });

        const wrapper = mount(SkillsView);

        await flushPromises();

        const editButtons = wrapper
            .findAll('button')
            .filter((button) => button.text() === 'Edit');

        await editButtons[0].trigger('click');

        const inputs = wrapper.findAll('input');

        expect(
            (inputs[0].element as HTMLInputElement).value
        ).toBe('TypeScript');

        await inputs[0].setValue('JavaScript');

        await wrapper.get('form').trigger('submit');

        await flushPromises();

        expect(updateSkill).toHaveBeenCalledWith(
            1,
            {
                name: 'JavaScript',
                category: 'language',
            }
        );

        expect(wrapper.text()).toContain('JavaScript');
    });

    it('deletes a skill', async () => {
        vi.spyOn(window, 'confirm')
            .mockReturnValue(true);

        vi.mocked(deleteSkill)
            .mockResolvedValue(undefined);

        const wrapper = mount(SkillsView);

        await flushPromises();

        const deleteButtons = wrapper
            .findAll('button')
            .filter((button) => button.text() === 'Delete');

        await deleteButtons[0].trigger('click');

        await flushPromises();

        expect(window.confirm)
            .toHaveBeenCalledWith(
                'Delete skill "TypeScript"?'
            );

        expect(deleteSkill)
            .toHaveBeenCalledWith(1);

        expect(wrapper.text())
            .not.toContain('TypeScript');

        expect(wrapper.text())
            .toContain('PostgreSQL');
    });

    it('does not delete when confirmation is cancelled', async () => {
        vi.spyOn(window, 'confirm')
            .mockReturnValue(false);

        const wrapper = mount(SkillsView);

        await flushPromises();

        const deleteButtons = wrapper
            .findAll('button')
            .filter((button) => button.text() === 'Delete');

        await deleteButtons[0].trigger('click');

        expect(deleteSkill).not.toHaveBeenCalled();

        expect(wrapper.text()).toContain('TypeScript');
    });

    it('displays an API error when creation fails', async () => {
        vi.mocked(createSkill).mockRejectedValue(
            new Error(
                "Skill 'TypeScript' already exists"
            )
        );

        const wrapper = mount(SkillsView);

        await flushPromises();

        const inputs = wrapper.findAll('input');

        await inputs[0].setValue('TypeScript');
        await inputs[1].setValue('language');

        await wrapper.get('form').trigger('submit');

        await flushPromises();

        expect(wrapper.text()).toContain(
            "Skill 'TypeScript' already exists"
        );
    });
});