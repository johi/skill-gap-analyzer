import { apiRequest } from './client';

import type {
    Skill,
    SkillInput,
} from '../types/skill';

export function getSkills(): Promise<Skill[]> {
    return apiRequest<Skill[]>('/api/v1/skills');
}

export function createSkill(
    input: SkillInput
): Promise<Skill> {
    return apiRequest<Skill>(
        '/api/v1/skills',
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
    return apiRequest<Skill>(
        `/api/v1/skills/${id}`,
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
        {
            method: 'DELETE',
        }
    );
}