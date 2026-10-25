
import type { JobService } from '@/services/job-service';
import {
    JobMatchService,
    type JobMatchResult,
    type JobMatchSkill,
} from '@/services/job-match-service';
import type { UserSkillRepository } from '@/repositories/user-skill-repository';

export class JobMatchAnalysisService {
    constructor(
        private readonly jobService: JobService,
        private readonly userSkillRepository: UserSkillRepository,
        private readonly jobMatchService: JobMatchService
    ) {}

    async getJobMatch(jobId: number): Promise<JobMatchResult> {
        const [job, assessments] = await Promise.all([
            this.jobService.get(jobId),
            this.userSkillRepository.findAll(),
        ]);

        const jobSkills: JobMatchSkill[] = job.skills.map(
            (skill) => ({
                id: skill.id,
                name: skill.name,
                category: skill.category,
                requirement: skill.requirement as JobMatchSkill['requirement'],
            })
        );

        return this.jobMatchService.calculate(
            jobSkills,
            assessments.map((assessment) => ({
                skillId: assessment.skillId,
                level: assessment.level,
            }))
        );
    }
}
