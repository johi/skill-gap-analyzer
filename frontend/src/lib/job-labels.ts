import type { z } from 'zod';
import {
  applicationStatusSchema,
  employmentTypeSchema,
  jobSkillRequirementSchema,
  languageRequirementSchema,
  senioritySchema,
  workModelSchema,
} from '@/schemas/job';

export const workModelLabels = {
  onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote',
} satisfies Record<z.infer<typeof workModelSchema>, string>;

export const employmentTypeLabels = {
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', temporary: 'Temporary',
} satisfies Record<z.infer<typeof employmentTypeSchema>, string>;

export const seniorityLabels = {
  junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead', staff: 'Staff', principal: 'Principal',
} satisfies Record<z.infer<typeof senioritySchema>, string>;

export const applicationStatusLabels = {
  not_applied: 'Not applied', applied: 'Applied', interview: 'Interview',
  rejected: 'Rejected', offer: 'Offer', expired: 'Expired',
} satisfies Record<z.infer<typeof applicationStatusSchema>, string>;

export const jobSkillRequirementLabels = {
  must_have: 'Must have', nice_to_have: 'Nice to have',
} satisfies Record<z.infer<typeof jobSkillRequirementSchema>, string>;

export const languageRequirementLabels = {
  required: 'Required', preferred: 'Preferred',
} satisfies Record<z.infer<typeof languageRequirementSchema>, string>;
