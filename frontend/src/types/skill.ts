export interface Skill {
    id: number;
    name: string;
    category: string;
    createdAt: string;
    updatedAt: string;
}

export interface SkillInput {
    name: string;
    category: string;
}