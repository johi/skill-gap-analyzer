import { db } from '@/db';
import type { Database } from '@/db/types';
import {
    NewSkill,
    Skill,
    SkillRepository,
} from '@/repositories/skill-repository';

import { canonicalSkillCategory } from '@/skills/skill-category';

import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '@/errors/application-errors';

export class SkillService {
    constructor(
        private readonly skillRepository: SkillRepository,
        private readonly database: Pick<Database, 'transaction'> = db
    ) {}

    async list(): Promise<Skill[]> {
        return this.skillRepository.findAll();
    }

    async listPage(query: import('@/schemas/list-pagination').ListPaginationQuery) {
        return this.skillRepository.findPage(query);
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

        const category = await this.canonicalCategory(data.category);
        return this.skillRepository.create({ ...data, category });
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

        const category = await this.canonicalCategory(data.category);
        const updated = await this.skillRepository.update(id, { ...data, category });

        if (!updated) {
            throw new NotFoundError(`Skill ${id} not found`);
        }

        return updated;
    }

    private async canonicalCategory(value: string): Promise<string> {
        const known = (await this.skillRepository.findAll()).map(skill => skill.category);
        const category = canonicalSkillCategory(value, known);
        if (!category) throw new ValidationError('Skill category is required');
        return category;
    }

    async merge(sourceIds: number[], targetId: number): Promise<void> {
        if (sourceIds.includes(targetId)) {
            throw new ValidationError('Target skill cannot be a source skill');
        }
        await this.database.transaction(async tx => {
            await new SkillRepository(tx).merge(sourceIds, targetId);
        });
    }

    async delete(id: number): Promise<void> {
        const deleted = await this.skillRepository.delete(id);

        if (!deleted) {
            throw new NotFoundError(`Skill ${id} not found`);
        }
    }
}
