<script setup lang="ts">
import { reactive } from 'vue';

import type {
  CreateJobInput,
  JobSkillRequirement,
} from '../types/job';

const emit = defineEmits<{
  submit: [input: CreateJobInput];
}>();

defineProps<{
  submitting?: boolean;
}>();

interface JobSkillForm {
  name: string;
  category: string;
  requirement: JobSkillRequirement;
}

const form = reactive({
  dateFound: '',
  company: '',
  title: '',
  sourceUrl: '',
  originalText: '',
  location: '',
  workModel: '',
  employmentType: '',
  seniority: '',
  primaryRole: '',
  yearsRequired: '',
  educationRequirement: '',
  danishRequired: '',
  salaryRate: '',
  interest: null as number | null,
  originalMatch: null as number | null,
  applyStatus: '',
  gapNotes: '',
  skills: [] as JobSkillForm[],
});

function nullableString(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}

function nullableNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }

  return Number(value);
}

function addSkill(): void {
  form.skills.push({
    name: '',
    category: '',
    requirement: 'must_have',
  });
}

function removeSkill(index: number): void {
  form.skills.splice(index, 1);
}

function submit(): void {
  emit('submit', {
    dateFound: form.dateFound,
    company: form.company.trim(),
    title: form.title.trim(),
    sourceUrl: nullableString(form.sourceUrl),
    originalText: nullableString(form.originalText),
    location: nullableString(form.location),
    workModel: nullableString(form.workModel),
    employmentType: nullableString(form.employmentType),
    seniority: nullableString(form.seniority),
    primaryRole: nullableString(form.primaryRole),
    yearsRequired: nullableString(form.yearsRequired),
    educationRequirement:
        nullableString(form.educationRequirement),
    danishRequired: nullableString(form.danishRequired),
    salaryRate: nullableString(form.salaryRate),
    interest: form.interest,
    applyStatus: nullableString(form.applyStatus),
    gapNotes: nullableString(form.gapNotes),
    originalMatch: form.originalMatch,
    skills: form.skills.map((skill) => ({
      name: skill.name.trim(),
      category: skill.category.trim(),
      requirement: skill.requirement,
    })),
  });
}
</script>

<template>
  <form @submit.prevent="submit">
    <p>
      <label>
        Date found
        <input
            v-model="form.dateFound"
            type="date"
            required
        >
      </label>
    </p>

    <p>
      <label>
        Company
        <input
            v-model="form.company"
            type="text"
            required
        >
      </label>
    </p>

    <p>
      <label>
        Title
        <input
            v-model="form.title"
            type="text"
            required
        >
      </label>
    </p>

    <p>
      <label>
        Source URL
        <input
            v-model="form.sourceUrl"
            type="url"
        >
      </label>
    </p>

    <p>
      <label>
        Location
        <input
            v-model="form.location"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Work model
        <input
            v-model="form.workModel"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Employment type
        <input
            v-model="form.employmentType"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Seniority
        <input
            v-model="form.seniority"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Primary role
        <input
            v-model="form.primaryRole"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Years required
        <input
            v-model="form.yearsRequired"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Education requirement
        <textarea
            v-model="form.educationRequirement"
        />
      </label>
    </p>

    <p>
      <label>
        Danish required
        <input
            v-model="form.danishRequired"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Salary
        <input
            v-model="form.salaryRate"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Interest
        <input
            v-model.number="form.interest"
            type="number"
            min="0"
            max="100"
        >
      </label>
    </p>

    <p>
      <label>
        Application status
        <input
            v-model="form.applyStatus"
            type="text"
        >
      </label>
    </p>

    <p>
      <label>
        Original match
        <input
            v-model.number="form.originalMatch"
            type="number"
            min="0"
            max="100"
        >
      </label>
    </p>

    <p>
      <label>
        Gap notes
        <textarea v-model="form.gapNotes" />
      </label>
    </p>

    <p>
      <label>
        Original text
        <textarea v-model="form.originalText" />
      </label>
    </p>

    <h2>Skills</h2>

    <div
        v-for="(skill, index) in form.skills"
        :key="index"
    >
      <input
          v-model="skill.name"
          type="text"
          placeholder="Skill"
          required
      >

      <input
          v-model="skill.category"
          type="text"
          placeholder="Category"
          required
      >

      <select v-model="skill.requirement">
        <option value="must_have">
          Must have
        </option>

        <option value="nice_to_have">
          Nice to have
        </option>
      </select>

      <button
          type="button"
          @click="removeSkill(index)"
      >
        Remove
      </button>
    </div>

    <p>
      <button
          type="button"
          @click="addSkill"
      >
        Add skill
      </button>
    </p>

    <button
        type="submit"
        :disabled="submitting"
    >
      {{ submitting ? 'Creating...' : 'Create job' }}
    </button>
  </form>
</template>