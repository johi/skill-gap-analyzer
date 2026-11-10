import { db } from '@/db';
import { JobRepository, type JobWithSkills } from '@/repositories/job-repository';
import type { UserSkillRepository } from '@/repositories/user-skill-repository';
import type { ListJobsQuery } from '@/schemas/job';
import { pagination } from '@/schemas/list-pagination';
import { JobMatchService } from '@/services/job-match-service';

export interface ComparedJob extends JobWithSkills {
    matchPercentage: number | null;
    assessmentCoverage: number;
}

function compareNullable(a: number | string | null, b: number | string | null, direction: 1 | -1): number {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a < b ? -direction : a > b ? direction : 0;
}

export class JobComparisonService {
    constructor(
        private readonly userSkillRepository: UserSkillRepository,
        private readonly matchService: JobMatchService,
        private readonly jobRepository: Pick<JobRepository, 'findAll'> = new JobRepository(db)
    ) {}

    async list(query: ListJobsQuery) {
        const [jobs, assessments] = await Promise.all([
            this.jobRepository.findAll(),
            this.userSkillRepository.findAll(),
        ]);
        const search = query.search.toLocaleLowerCase();
        const filtered = jobs.filter(job =>
            (!search || [job.company, job.title, job.location].some(value => value?.toLocaleLowerCase().includes(search))) &&
            (!query.workModel || job.workModel === query.workModel) &&
            (!query.seniority || job.seniority === query.seniority) &&
            (!query.employmentType || job.employmentType === query.employmentType) &&
            (!query.applyStatus || job.applyStatus === query.applyStatus)
        );
        const compared: ComparedJob[] = filtered.map(job => {
            const { matchPercentage, assessmentCoverage } = this.matchService.calculate(job.skills, assessments);
            return { ...job, matchPercentage, assessmentCoverage };
        });
        const direction: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1;
        compared.sort((a, b) => {
            const primary = query.sortBy === 'matchPercentage'
                ? compareNullable(a.matchPercentage, b.matchPercentage, direction)
                : query.sortBy === 'company'
                    ? direction * a.company.localeCompare(b.company)
                    : compareNullable(a[query.sortBy], b[query.sortBy], direction);
            if (primary !== 0) return primary;
            if (query.sortBy === 'matchPercentage' && a.assessmentCoverage !== b.assessmentCoverage) {
                return b.assessmentCoverage - a.assessmentCoverage;
            }
            return b.id - a.id;
        });
        const meta = pagination(query.page, query.pageSize, compared.length);
        const start = (meta.page - 1) * meta.pageSize;
        return {
            data: compared.slice(start, start + meta.pageSize),
            pagination: meta,
        };
    }
}
