
import type { JobService } from '@/services/job-service';
import {
    JobMatchService,
    type JobMatchResult,
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

        return this.jobMatchService.calculate(job.skills, assessments);
    }
}
