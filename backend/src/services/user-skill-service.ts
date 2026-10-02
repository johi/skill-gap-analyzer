import {
    UserSkill,
    UserSkillRepository,
} from '@/repositories/user-skill-repository';

import { SkillRepository } from '@/repositories/skill-repository';
import { NotFoundError } from '@/errors/application-errors';
import type { SkillLevel } from '@/schemas/user-skill';

export class UserSkillService {
    constructor(
        private readonly userSkillRepository: UserSkillRepository,
        private readonly skillRepository: SkillRepository
    ) {}

    async list() {
        return this.userSkillRepository.findAll();
    }

    async get(skillId: number): Promise<UserSkill> {
        const userSkill =
            await this.userSkillRepository.findBySkillId(skillId);

        if (!userSkill) {
            throw new NotFoundError(
                `User skill assessment for skill ${skillId} not found`
            );
        }

        return userSkill;
    }

    async setLevel(
        skillId: number,
        level: SkillLevel
    ): Promise<UserSkill> {
        const skill = await this.skillRepository.findById(skillId);

        if (!skill) {
            throw new NotFoundError(`Skill ${skillId} not found`);
        }

        return this.userSkillRepository.upsert(
            skillId,
            level
        );
    }

    async delete(skillId: number): Promise<void> {
        const deleted =
            await this.userSkillRepository.delete(skillId);

        if (!deleted) {
            throw new NotFoundError(
                `User skill assessment for skill ${skillId} not found`
            );
        }
    }
}