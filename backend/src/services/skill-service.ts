import {
    NewSkill,
    Skill,
    SkillRepository,
} from '@/repositories/skill-repository';

import {
    ConflictError,
    NotFoundError,
} from '@/errors/application-errors';

export class SkillService {
    constructor(
        private readonly skillRepository: SkillRepository
    ) {}

    async list(): Promise<Skill[]> {
        return this.skillRepository.findAll();
    }

    async get(id: number): Promise<Skill> {
        const skill = await this.skillRepository.findById(id);

        if (!skill) {
            throw new NotFoundError(`Skill ${id} not found`);
        }

        return skill;
    }

    async create(data: NewSkill): Promise<Skill> {
        const existing = await this.skillRepository.findByName(data.name);

        if (existing) {
            throw new ConflictError(
                `Skill '${data.name}' already exists`
            );
        }

        return this.skillRepository.create(data);
    }

    async update(
        id: number,
        data: NewSkill
    ): Promise<Skill> {
        const existing = await this.skillRepository.findById(id);

        if (!existing) {
            throw new NotFoundError(`Skill ${id} not found`);
        }

        const skillWithSameName =
            await this.skillRepository.findByName(data.name);

        if (
            skillWithSameName &&
            skillWithSameName.id !== id
        ) {
            throw new ConflictError(
                `Skill '${data.name}' already exists`
            );
        }

        const updated = await this.skillRepository.update(id, data);

        if (!updated) {
            throw new NotFoundError(`Skill ${id} not found`);
        }

        return updated;
    }

    async delete(id: number): Promise<void> {
        const deleted = await this.skillRepository.delete(id);

        if (!deleted) {
            throw new NotFoundError(`Skill ${id} not found`);
        }
    }
}