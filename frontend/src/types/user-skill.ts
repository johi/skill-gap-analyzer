export interface UserSkill {
    skillId: number;
    name: string;
    category: string;
    level: number;
    updatedAt: string;
}

export interface UserSkillAssessment {
    skillId: number;
    level: number;
    updatedAt: string;
}