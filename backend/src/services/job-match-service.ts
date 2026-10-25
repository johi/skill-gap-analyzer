
export type JobSkillRequirement = 'must_have' | 'nice_to_have';

export interface JobMatchSkill {
    id: number;
    name: string;
    category: string;
    requirement: JobSkillRequirement;
}

export interface JobMatchAssessment {
    skillId: number;
    level: number;
}

export interface MatchedJobSkill extends JobMatchSkill {
    proficiency: number | null;
    matchFactor: number | null;
    status: 'assessed' | 'unassessed';
}

export interface JobMatchResult {
    matchPercentage: number | null;
    assessmentCoverage: number;
    totalSkills: number;
    assessedSkills: number;
    skills: MatchedJobSkill[];
    missingInformation: string[];
}

const SATISFYING_PROFICIENCY = 4;

function requirementWeight(
    requirement: JobSkillRequirement
): number {
    return requirement === 'must_have' ? 2 : 1;
}

function roundToOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
}

export class JobMatchService {
    calculate(
        jobSkills: JobMatchSkill[],
        assessments: JobMatchAssessment[]
    ): JobMatchResult {
        const proficiencyBySkillId = new Map(
            assessments.map((assessment) => [
                assessment.skillId,
                assessment.level,
            ])
        );

        let totalWeight = 0;
        let assessedWeight = 0;
        let weightedMatch = 0;
        let assessedSkills = 0;

        const skills = jobSkills.map(
            (skill): MatchedJobSkill => {
                const weight = requirementWeight(
                    skill.requirement
                );

                totalWeight += weight;

                const proficiency =
                    proficiencyBySkillId.get(skill.id) ?? null;

                if (proficiency === null) {
                    return {
                        ...skill,
                        proficiency: null,
                        matchFactor: null,
                        status: 'unassessed',
                    };
                }

                const matchFactor = Math.min(
                    1,
                    proficiency / SATISFYING_PROFICIENCY
                );

                assessedSkills++;
                assessedWeight += weight;
                weightedMatch += weight * matchFactor;

                return {
                    ...skill,
                    proficiency,
                    matchFactor,
                    status: 'assessed',
                };
            }
        );

        const missingInformation: string[] = [];

        if (totalWeight === 0) {
            missingInformation.push('job_skills');
        }

        if (assessedWeight < totalWeight) {
            missingInformation.push('skill_assessments');
        }

        return {
            matchPercentage: assessedWeight === 0
                ? null
                : roundToOneDecimal(
                    100 * weightedMatch / assessedWeight
                ),
            assessmentCoverage: totalWeight === 0
                ? 0
                : roundToOneDecimal(
                    100 * assessedWeight / totalWeight
                ),
            totalSkills: jobSkills.length,
            assessedSkills,
            skills,
            missingInformation,
        };
    }
}
