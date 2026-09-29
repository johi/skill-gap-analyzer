import { apiRequest } from './client';

import type {
    UserSkill,
    UserSkillAssessment,
} from '../types/user-skill';

export function getUserSkills(): Promise<UserSkill[]> {
    return apiRequest<UserSkill[]>(
        '/api/v1/user-skills'
    );
}

export function setUserSkillLevel(
    skillId: number,
    level: number
): Promise<UserSkillAssessment> {
    return apiRequest<UserSkillAssessment>(
        `/api/v1/user-skills/${skillId}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                level,
            }),
        }
    );
}

export function deleteUserSkill(
    skillId: number
): Promise<void> {
    return apiRequest<void>(
        `/api/v1/user-skills/${skillId}`,
        {
            method: 'DELETE',
        }
    );
}