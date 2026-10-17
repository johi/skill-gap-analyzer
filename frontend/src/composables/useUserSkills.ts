import {computed, onMounted, ref} from 'vue';
import {getSkills} from '@/api/skills';
import {deleteUserSkill, getUserSkills, setUserSkillLevel} from '@/api/user-skills';
import type {Skill} from '@/types/skill';
import type {SkillLevel, UserSkill} from '@/types/user-skill';
import {skillLevelSchema} from '@/schemas/user-skill';

export interface SkillRow {
  id: number;
  name: string;
  category: string;
  level: SkillLevel | null;
}

export function useUserSkills() {

  const skills = ref<Skill[]>([]);
  const userSkills = ref<UserSkill[]>([]);

  const loading = ref(true);
  const error = ref<string | null>(null);
  const savingSkillId = ref<number | null>(null);

  const rows = computed<SkillRow[]>(() => {
    const assessments = new Map(
        userSkills.value.map((assessment) => [
          assessment.skillId,
          assessment,
        ])
    );

    return skills.value.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      level: assessments.get(skill.id)?.level ?? null,
    }));
  });

  onMounted(loadData);

  async function loadData(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const [
        loadedSkills,
        loadedUserSkills,
      ] = await Promise.all([
        getSkills(),
        getUserSkills(),
      ]);

      skills.value = loadedSkills;
      userSkills.value = loadedUserSkills.map((assessment) => ({...assessment}));
    } catch (err) {
      error.value = getErrorMessage(
          err,
          'Unable to load skill assessments'
      );
    } finally {
      loading.value = false;
    }
  }

  async function setLevel(
      row: SkillRow,
      value: string
  ): Promise<void> {

    if (value === '') {
      await removeAssessment(row);

      return;
    }

    const level = skillLevelSchema.parse(
        Number(value)
    );

    savingSkillId.value = row.id;
    error.value = null;

    try {
      const assessment = await setUserSkillLevel(
          row.id,
          level
      );

      const existingIndex = userSkills.value.findIndex(
          (item) => item.skillId === row.id
      );

      const updated: UserSkill = {
        skillId: assessment.skillId,
        name: row.name,
        category: row.category,
        level: assessment.level,
        updatedAt: assessment.updatedAt,
      };

      if (existingIndex === -1) {
        userSkills.value.push(updated);
      } else {
        userSkills.value[existingIndex] = updated;
      }
    } catch (err) {
      error.value = getErrorMessage(
          err,
          'Unable to save skill assessment'
      );
    } finally {
      savingSkillId.value = null;
    }
  }

  async function removeAssessment(
      row: SkillRow
  ): Promise<void> {
    if (row.level === null) {
      return;
    }

    savingSkillId.value = row.id;
    error.value = null;

    try {
      await deleteUserSkill(row.id);

      userSkills.value = userSkills.value.filter(
          (item) => item.skillId !== row.id
      );
    } catch (err) {
      error.value = getErrorMessage(
          err,
          'Unable to remove skill assessment'
      );
    } finally {
      savingSkillId.value = null;
    }
  }

  function getErrorMessage(
      err: unknown,
      fallback: string
  ): string {
    return err instanceof Error
        ? err.message
        : fallback;
  }
  return {rows, loading, error, savingSkillId, setLevel};
}
