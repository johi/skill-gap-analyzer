import { apiRequest } from './client';
import {
    skillSchema,
    skillsSchema,
} from '@/schemas/skill';

import type {
    Skill,
    SkillInput,
} from '@/types/skill';

export function getSkills(): Promise<Skill[]> {
    return apiRequest(
        '/api/v1/skills',
        skillsSchema
    );
}

export function createSkill(
    input: SkillInput
): Promise<Skill> {
    return apiRequest(
        '/api/v1/skills',
        skillSchema,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }
    );
}

export function updateSkill(
    id: number,
    input: SkillInput
): Promise<Skill> {
    return apiRequest(
        `/api/v1/skills/${id}`,
        skillSchema,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        }
    );
}

export function deleteSkill(id: number): Promise<void> {
    return apiRequest<void>(
        `/api/v1/skills/${id}`,
        null,
        {
            method: 'DELETE',
        }
    );
}