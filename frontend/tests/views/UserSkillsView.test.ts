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

import UserSkillsView from '../../src/views/UserSkillsView.vue';

import { getSkills } from '../../src/api/skills';

import {
    deleteUserSkill,
    getUserSkills,
    setUserSkillLevel,
} from '../../src/api/user-skills';

vi.mock('../../src/api/skills', () => ({
    getSkills: vi.fn(),
}));

vi.mock('../../src/api/user-skills', () => ({
    getUserSkills: vi.fn(),
    setUserSkillLevel: vi.fn(),
    deleteUserSkill: vi.fn(),
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

const assessments = [
    {
        skillId: 1,
        name: 'TypeScript',
        category: 'language',
        level: 3,
        updatedAt: '2026-09-29T11:00:00.000Z',
    },
];

describe('UserSkillsView', () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(getSkills)
            .mockResolvedValue(skills);

        vi.mocked(getUserSkills)
            .mockResolvedValue(assessments);
    });

    it('loads skills and existing assessments', async () => {
        const wrapper = mount(UserSkillsView);

        await flushPromises();

        expect(getSkills).toHaveBeenCalledOnce();
        expect(getUserSkills).toHaveBeenCalledOnce();

        expect(wrapper.text()).toContain('TypeScript');
        expect(wrapper.text()).toContain('PostgreSQL');

        const selects = wrapper.findAll('select');

        expect(
            (selects[0].element as HTMLSelectElement).value
        ).toBe('3');

        expect(
            (selects[1].element as HTMLSelectElement).value
        ).toBe('');
    });

    it('creates an assessment for an unassessed skill', async () => {
        vi.mocked(setUserSkillLevel)
            .mockResolvedValue({
                skillId: 2,
                level: 4,
                updatedAt: '2026-09-29T12:00:00.000Z',
            });

        const wrapper = mount(UserSkillsView);

        await flushPromises();

        const selects = wrapper.findAll('select');

        await selects[1].setValue('4');

        await flushPromises();

        expect(setUserSkillLevel)
            .toHaveBeenCalledWith(2, 4);

        expect(
            (wrapper.findAll('select')[1]
                .element as HTMLSelectElement).value
        ).toBe('4');
    });

    it('updates an existing assessment', async () => {
        vi.mocked(setUserSkillLevel)
            .mockResolvedValue({
                skillId: 1,
                level: 5,
                updatedAt: '2026-09-29T12:00:00.000Z',
            });

        const wrapper = mount(UserSkillsView);

        await flushPromises();

        const select = wrapper.findAll('select')[0];

        await select.setValue('5');

        await flushPromises();

        expect(setUserSkillLevel)
            .toHaveBeenCalledWith(1, 5);

        expect(
            (wrapper.findAll('select')[0]
                .element as HTMLSelectElement).value
        ).toBe('5');
    });

    it('removes an existing assessment', async () => {
        vi.mocked(deleteUserSkill)
            .mockResolvedValue(undefined);

        const wrapper = mount(UserSkillsView);

        await flushPromises();

        const select = wrapper.findAll('select')[0];

        await select.setValue('');

        await flushPromises();

        expect(deleteUserSkill)
            .toHaveBeenCalledWith(1);

        expect(
            (wrapper.findAll('select')[0]
                .element as HTMLSelectElement).value
        ).toBe('');
    });

    it('displays an error when saving fails', async () => {
        vi.mocked(setUserSkillLevel)
            .mockRejectedValue(
                new Error('Unable to save assessment')
            );

        const wrapper = mount(UserSkillsView);

        await flushPromises();

        const select = wrapper.findAll('select')[1];

        await select.setValue('4');

        await flushPromises();

        expect(wrapper.text()).toContain(
            'Unable to save assessment'
        );
    });
});