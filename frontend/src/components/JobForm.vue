<script setup lang="ts">
import { reactive } from 'vue';

import type {
  ApplicationStatus,
  CreateJobInput,
  DanishRequirement,
  EmploymentType,
  JobSkillRequirement,
  Seniority,
  WorkModel,
} from '@/types/job';

import {
  Plus,
  Trash2,
} from 'lucide-vue-next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const emit = defineEmits<{
  submit: [input: CreateJobInput];
}>();

const props = defineProps<{
  initialValue?: CreateJobInput;
  submitting?: boolean;
  submitLabel?: string;
}>();

interface JobSkillForm {
  name: string;
  category: string;
  requirement: JobSkillRequirement;
}

interface JobFormState {
  dateFound: string;
  company: string;
  title: string;
  sourceUrl: string;
  originalText: string;
  location: string;
  workModel: WorkModel | '';
  employmentType: EmploymentType | '';
  seniority: Seniority | '';
  primaryRole: string;
  yearsRequired: string;
  educationRequirement: string;
  danishRequired: DanishRequirement | '';
  salaryRate: string;
  interest: number | null;
  applyStatus: ApplicationStatus | '';
  gapNotes: string;
  originalMatch: number | null;
  skills: JobSkillForm[];
}

const form = reactive<JobFormState>({
  dateFound: props.initialValue?.dateFound ?? '',
  company: props.initialValue?.company ?? '',
  title: props.initialValue?.title ?? '',
  sourceUrl: props.initialValue?.sourceUrl ?? '',
  originalText: props.initialValue?.originalText ?? '',
  location: props.initialValue?.location ?? '',
  workModel: props.initialValue?.workModel ?? '',
  employmentType: props.initialValue?.employmentType ?? '',
  seniority: props.initialValue?.seniority ?? '',
  primaryRole: props.initialValue?.primaryRole ?? '',
  yearsRequired: props.initialValue?.yearsRequired ?? '',
  educationRequirement:
      props.initialValue?.educationRequirement ?? '',
  danishRequired: props.initialValue?.danishRequired ?? '',
  salaryRate: props.initialValue?.salaryRate ?? '',
  interest: props.initialValue?.interest ?? null,
  applyStatus: props.initialValue?.applyStatus ?? '',
  gapNotes: props.initialValue?.gapNotes ?? '',
  originalMatch: props.initialValue?.originalMatch ?? null,

  skills: props.initialValue?.skills.map((skill) => ({
    ...skill,
  })) ?? [] as JobSkillForm[],
});

function nullableString(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
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
    workModel: form.workModel || null,
    employmentType: form.employmentType || null,
    seniority: form.seniority || null,
    primaryRole: nullableString(form.primaryRole),
    yearsRequired: nullableString(form.yearsRequired),
    educationRequirement:
        nullableString(form.educationRequirement),
    danishRequired: form.danishRequired || null,
    salaryRate: nullableString(form.salaryRate),
    interest: form.interest,
    applyStatus: form.applyStatus || null,
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
  <form class="space-y-8" @submit.prevent="submit">
    <section class="space-y-4">
      <div>
        <h2 class="text-base font-semibold">
          Opportunity
        </h2>

        <p class="text-sm text-muted-foreground">
          Basic information about the job opportunity.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="date-found">Date found</Label>

          <Input
              id="date-found"
              v-model="form.dateFound"
              type="date"
              required
          />
        </div>

        <div class="space-y-2">
          <Label for="company">Company</Label>

          <Input
              id="company"
              v-model="form.company"
              type="text"
              placeholder="Company name"
              required
          />
        </div>

        <div class="space-y-2 sm:col-span-2">
          <Label for="title">Title</Label>

          <Input
              id="title"
              v-model="form.title"
              type="text"
              placeholder="Job title"
              required
          />
        </div>

        <div class="space-y-2 sm:col-span-2">
          <Label for="source-url">Source URL</Label>

          <Input
              id="source-url"
              v-model="form.sourceUrl"
              type="url"
              placeholder="https://..."
          />
        </div>
      </div>
    </section>

    <Separator />

    <section class="space-y-4">
      <div>
        <h2 class="text-base font-semibold">
          Position
        </h2>

        <p class="text-sm text-muted-foreground">
          Role, employment and location details.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="location">Location</Label>

          <Input
              id="location"
              v-model="form.location"
              type="text"
              placeholder="e.g. Copenhagen"
          />
        </div>

        <div class="space-y-2">
          <Label for="work-model">Work model</Label>

          <select
              id="work-model"
              v-model="form.workModel"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Not specified</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="employment-type">
            Employment type
          </Label>

          <select
              id="employment-type"
              v-model="form.employmentType"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Not specified</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="temporary">Temporary</option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="seniority">Seniority</Label>

          <select
              id="seniority"
              v-model="form.seniority"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Not specified</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="staff">Staff</option>
            <option value="principal">Principal</option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="primary-role">Primary role</Label>

          <Input
              id="primary-role"
              v-model="form.primaryRole"
              type="text"
              placeholder="e.g. Backend Developer"
          />
        </div>

        <div class="space-y-2">
          <Label for="years-required">
            Years required
          </Label>

          <Input
              id="years-required"
              v-model="form.yearsRequired"
              type="text"
              placeholder="e.g. 5+ years"
          />
        </div>

        <div class="space-y-2">
          <Label for="danish-required">
            Danish required
          </Label>

          <select
              id="danish-required"
              v-model="form.danishRequired"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Not specified</option>
            <option value="no">No</option>
            <option value="preferred">Preferred</option>
            <option value="required">Required</option>
          </select>
        </div>

        <div class="space-y-2">
          <Label for="salary">Salary</Label>

          <Input
              id="salary"
              v-model="form.salaryRate"
              type="text"
              placeholder="e.g. 65,000 DKK/month"
          />
        </div>

        <div class="space-y-2 sm:col-span-2">
          <Label for="education-requirement">
            Education requirement
          </Label>

          <Textarea
              id="education-requirement"
              v-model="form.educationRequirement"
              placeholder="Education or certification requirements"
          />
        </div>
      </div>
    </section>

    <Separator />

    <section class="space-y-4">
      <div>
        <h2 class="text-base font-semibold">
          Assessment
        </h2>

        <p class="text-sm text-muted-foreground">
          Record your interest and initial assessment of the role.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="interest">
            Interest (%)
          </Label>

          <input
              id="interest"
              v-model.number="form.interest"
              type="number"
              min="0"
              max="100"
              placeholder="0–100"
              class="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div class="space-y-2">
          <Label for="original-match">
            Original match (%)
          </Label>

          <input
              id="original-match"
              v-model.number="form.originalMatch"
              type="number"
              min="0"
              max="100"
              placeholder="0–100"
              class="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div class="space-y-2 sm:col-span-2">
          <Label for="application-status">
            Application status
          </Label>

          <select
              id="application-status"
              v-model="form.applyStatus"
              class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Not specified</option>
            <option value="not_applied">Not applied</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="rejected">Rejected</option>
            <option value="offer">Offer</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div class="space-y-2 sm:col-span-2">
          <Label for="gap-notes">
            Gap notes
          </Label>

          <Textarea
              id="gap-notes"
              v-model="form.gapNotes"
              placeholder="Important gaps or observations"
              class="min-h-24"
          />
        </div>
      </div>
    </section>

    <Separator />

    <section class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-semibold">
            Required skills
          </h2>

          <p class="text-sm text-muted-foreground">
            Skills extracted from the job requirements.
          </p>
        </div>

        <Button
            type="button"
            variant="outline"
            size="sm"
            @click="addSkill"
        >
          <Plus class="size-4" />
          Add skill
        </Button>
      </div>

      <div
          v-if="form.skills.length === 0"
          class="rounded-lg border border-dashed p-6 text-center"
      >
        <p class="text-sm text-muted-foreground">
          No skills have been added yet.
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
            v-for="(skill, index) in form.skills"
            :key="index"
            class="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-[1fr_1fr_180px_auto] md:items-end"
        >
          <div class="space-y-2">
            <Label :for="`skill-name-${index}`">
              Skill
            </Label>

            <Input
                :id="`skill-name-${index}`"
                v-model="skill.name"
                type="text"
                placeholder="e.g. TypeScript"
                required
            />
          </div>

          <div class="space-y-2">
            <Label :for="`skill-category-${index}`">
              Category
            </Label>

            <Input
                :id="`skill-category-${index}`"
                v-model="skill.category"
                type="text"
                placeholder="e.g. Language"
                required
            />
          </div>

          <div class="space-y-2">
            <Label :for="`skill-requirement-${index}`">
              Requirement
            </Label>

            <select
                :id="`skill-requirement-${index}`"
                v-model="skill.requirement"
                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="must_have">
                Must have
              </option>

              <option value="nice_to_have">
                Nice to have
              </option>
            </select>
          </div>

          <Button
              type="button"
              variant="ghost"
              size="sm"
              @click="removeSkill(index)"
          >
            <Trash2 class="size-4" />
            Remove
          </Button>
        </div>
      </div>
    </section>

    <Separator />

    <section class="space-y-4">
      <div>
        <h2 class="text-base font-semibold">
          Original job posting
        </h2>

        <p class="text-sm text-muted-foreground">
          Preserve the original job advertisement for reference.
        </p>
      </div>

      <div class="space-y-2">
        <Label for="original-text">Original text</Label>

        <Textarea
            id="original-text"
            v-model="form.originalText"
            placeholder="Paste the original job advertisement here..."
            class="min-h-64"
        />
      </div>
    </section>

    <div class="flex justify-end border-t pt-6">
      <Button
          type="submit"
          :disabled="submitting"
      >
        {{
          submitting
              ? (submitLabel ? 'Saving...' : 'Creating...')
              : (submitLabel ?? 'Create job')
        }}
      </Button>
    </div>
  </form>
</template>