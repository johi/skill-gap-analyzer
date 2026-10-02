import { apiRequest } from './client';
import {
    userSkillAssessmentSchema,
    userSkillsSchema,
} from '../schemas/user-skill';

import type {
    UserSkill,
    UserSkillAssessment,
} from '../types/user-skill';

export function getUserSkills(): Promise<UserSkill[]> {
    return apiRequest(
        '/api/v1/user-skills',
        userSkillsSchema
    );
}

export function setUserSkillLevel(
    skillId: number,
    level: number
): Promise<UserSkillAssessment> {
    return apiRequest(
        `/api/v1/user-skills/${skillId}`,
        userSkillAssessmentSchema,
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
        null,
        {
            method: 'DELETE',
        }
    );
}