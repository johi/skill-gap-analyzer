import {
    describe,
    expect,
    it,
} from 'vitest';

import { mount } from '@vue/test-utils';

import JobForm from '../../src/components/JobForm.vue';

describe('JobForm', () => {
    it('submits a job input', async () => {
        const wrapper = mount(JobForm);

        await wrapper
            .get('input[type="date"]')
            .setValue('2026-09-29');

        const textInputs = wrapper.findAll(
            'input[type="text"]'
        );

        await textInputs[0].setValue(
            'Example Technologies'
        );

        await textInputs[1].setValue(
            'Senior Backend Developer'
        );

        await wrapper.get('form').trigger('submit');

        const submissions = wrapper.emitted('submit');

        expect(submissions).toHaveLength(1);

        expect(submissions?.[0]?.[0]).toMatchObject({
            dateFound: '2026-09-29',
            company: 'Example Technologies',
            title: 'Senior Backend Developer',
            interest: null,
            originalMatch: null,
            skills: [],
        });
    });

    it('adds and removes a skill', async () => {
        const wrapper = mount(JobForm);

        const buttons = () => wrapper.findAll('button');

        await buttons()
            .find((button) =>
                button.text() === 'Add skill'
            )!
            .trigger('click');

        expect(
            wrapper.find('select').exists()
        ).toBe(true);

        await buttons()
            .find((button) =>
                button.text() === 'Remove'
            )!
            .trigger('click');

        expect(
            wrapper.find('select').exists()
        ).toBe(false);
    });

    it('disables submission while submitting', () => {
        const wrapper = mount(JobForm, {
            props: {
                submitting: true,
            },
        });

        const submitButton = wrapper.get(
            'button[type="submit"]'
        );

        expect(
            submitButton.attributes('disabled')
        ).toBeDefined();

        expect(submitButton.text()).toBe(
            'Creating...'
        );
    });
});