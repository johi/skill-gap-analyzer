import { z } from 'zod';
import { paginationSchema, queryString, type ListQuery } from '@/schemas/list-pagination';
import { skillLevelSchema } from '@/schemas/user-skill';
import { apiRequest } from './client';
import {
    userSkillAssessmentSchema,
    userSkillsSchema,
} from '@/schemas/user-skill';

import type {
    SkillLevel,
    UserSkill,
    UserSkillAssessment,
} from '@/types/user-skill';

export function getUserSkills(): Promise<UserSkill[]> {
    return apiRequest(
        '/api/v1/user-skills',
        userSkillsSchema
    );
}

export function setUserSkillLevel(
    skillId: number,
    level: SkillLevel
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
export function getSkillAssessmentPage(query: ListQuery) {
  return apiRequest(`/api/v1/user-skills/catalogue?${queryString(query)}`,
    z.object({data: z.array(z.object({id: z.number(), name: z.string(), category: z.string(), level: skillLevelSchema.nullable()})), pagination: paginationSchema}));
}
