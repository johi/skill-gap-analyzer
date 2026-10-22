<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ArrowLeft, Sparkles } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useJobAnalysis } from '@/composables/useJobAnalysis';
import { getSkills } from '@/api/skills';
import type { Skill } from '@/types/skill';
import type { CreateJobInput } from '@/types/job';
import JobForm from '@/components/JobForm.vue';
import { analysisToReviewInput, validateReviewedAnalysis } from '@/services/job-analysis/reviewed-job';

const {
  advertisement, analysis, analyzing, error, validationErrors,
  canAnalyze, analyze, discard,
} = useJobAnalysis();

const skillCatalogue = ref<Skill[]>([]);
const loadingSkills = ref(false);
const skillsError = ref<string | null>(null);
const reviewErrors = ref<string[]>([]);
const approvedReview = ref<CreateJobInput | null>(null);
let skillsRequest = 0;

const reviewInput = computed(() => analysis.value ? analysisToReviewInput(analysis.value) : null);

async function loadSkillCatalogue(): Promise<void> {
  const request = ++skillsRequest;
  loadingSkills.value = true;
  skillsError.value = null;
  try {
    const skills = await getSkills();
    if (request === skillsRequest) skillCatalogue.value = skills;
  } catch {
    if (request === skillsRequest) skillsError.value = 'Unable to load the skill catalogue. Retry before approving this analysis.';
  } finally {
    if (request === skillsRequest) loadingSkills.value = false;
  }
}

watch(analysis, (current) => {
  ++skillsRequest;
  skillCatalogue.value = [];
  loadingSkills.value = false;
  skillsError.value = null;
  reviewErrors.value = [];
  approvedReview.value = null;
  if (current) void loadSkillCatalogue();
});

function invalidateApproval(): void {
  approvedReview.value = null;
  reviewErrors.value = [];
}

function approveReview(input: CreateJobInput): void {
  invalidateApproval();
  if (loadingSkills.value || skillsError.value) {
    reviewErrors.value = ['The skill catalogue must load before approval.'];
    return;
  }
  const result = validateReviewedAnalysis(input);
  if (!result.valid || !result.value) {
    reviewErrors.value = result.errors;
    return;
  }
  approvedReview.value = structuredClone(result.value);
}

function show(value: string | null): string {
  return value ?? 'Not specified';
}
</script>

<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/jobs"><ArrowLeft class="size-4" /> Back to jobs</RouterLink>
    </Button>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Analyze job advertisement
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        Paste an advertisement to extract job metadata and skill requirements with AI.
        Nothing is saved to the database during analysis.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Advertisement text</CardTitle>
        <CardDescription>
          The text will be sent to OpenAI for analysis. Enter 50–30,000 characters.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <label for="job-advertisement" class="text-sm font-medium">Raw job advertisement</label>
        <Textarea
          id="job-advertisement"
          v-model="advertisement"
          :disabled="analyzing"
          rows="12"
          placeholder="Paste the full job advertisement here…"
        />
        <p class="text-xs text-muted-foreground">{{ advertisement.trim().length }} / 30,000 characters</p>
        <Button :disabled="!canAnalyze" @click="analyze">
          <Sparkles class="size-4" />
          {{ analyzing ? 'Analyzing…' : 'Analyze advertisement' }}
        </Button>
      </CardContent>
    </Card>

    <div v-if="error" role="alert" class="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <p>{{ error }}</p>
      <ul v-if="validationErrors.length" class="mt-2 list-disc pl-5">
        <li v-for="issue in validationErrors" :key="issue">{{ issue }}</li>
      </ul>
    </div>

    <template v-if="analysis">
      <div class="rounded-md border p-4 text-sm" role="status">
        <p class="font-medium">AI analysis completed — not saved</p>
        <p class="mt-1 text-muted-foreground">
          {{ analysis.requiresReview ? 'Some fields need clarification.' : 'Review all extracted fields for accuracy.' }}
          Correct the proposal below and approve your review. Saving will be added in UC-13.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Extracted metadata</CardTitle></CardHeader>
        <CardContent>
          <dl class="grid gap-4 sm:grid-cols-2">
            <div v-for="field in [
              { label: 'Company', value: analysis.proposal.company },
              { label: 'Job title', value: analysis.proposal.title },
              { label: 'Location', value: analysis.proposal.location },
              { label: 'Work model', value: analysis.proposal.workModel },
              { label: 'Employment type', value: analysis.proposal.employmentType },
              { label: 'Seniority', value: analysis.proposal.seniority },
              { label: 'Primary role', value: analysis.proposal.primaryRole },
              { label: 'Experience required', value: analysis.proposal.yearsRequired },
              { label: 'Education', value: analysis.proposal.educationRequirement },
              { label: 'Salary', value: analysis.proposal.salaryRate },
            ]" :key="field.label">
              <dt class="text-xs font-medium text-muted-foreground">{{ field.label }}</dt>
              <dd class="mt-1 text-sm">{{ show(field.value) }}</dd>
            </div>
          </dl>
          <div class="mt-5">
            <h3 class="text-sm font-medium">Language requirements</h3>
            <p v-if="analysis.proposal.languageRequirements.length === 0" class="mt-1 text-sm text-muted-foreground">Not specified</p>
            <ul v-else class="mt-2 list-disc pl-5 text-sm">
              <li v-for="item in analysis.proposal.languageRequirements" :key="item.language">
                {{ item.language }} — {{ item.requirement }}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted skills ({{ analysis.proposal.skills.length }})</CardTitle>
          <CardDescription>Missing classifications are marked for review.</CardDescription>
        </CardHeader>
        <CardContent>
          <p v-if="analysis.proposal.skills.length === 0" class="text-sm text-muted-foreground">
            No skills identified.
          </p>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead><tr class="border-b">
                <th class="py-2 pr-4">Skill</th>
                <th class="py-2 pr-4">Category</th>
                <th class="py-2">Requirement</th>
              </tr></thead>
              <tbody>
                <tr v-for="skill in analysis.proposal.skills" :key="skill.name" class="border-b last:border-0">
                  <td class="py-2 pr-4">{{ skill.name }}</td>
                  <td class="py-2 pr-4">{{ skill.category ?? 'Review required' }}</td>
                  <td class="py-2">{{ skill.requirement ?? 'Review required' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card v-if="reviewInput">
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Review and correct analysis (UC-12)</CardTitle>
            <Button type="button" variant="outline" size="sm" @click="discard">Discard analysis</Button>
          </div>
          <CardDescription>
            Edit the proposed job, replace skills using the existing catalogue, and remove incorrect skills.
            Approval is local only; nothing is saved to the database.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <p v-if="loadingSkills" role="status" class="text-sm text-muted-foreground">Loading existing skills…</p>
          <div v-if="skillsError" role="alert" class="space-y-2 text-sm text-destructive">
            <p>{{ skillsError }}</p>
            <Button type="button" variant="outline" @click="loadSkillCatalogue">Retry loading skills</Button>
          </div>
          <div v-if="reviewErrors.length" role="alert" class="rounded-md border border-destructive/30 p-4 text-sm text-destructive">
            <p class="font-medium">Please correct the following before approval:</p>
            <ul class="mt-2 list-disc pl-5">
              <li v-for="issue in reviewErrors" :key="issue">{{ issue }}</li>
            </ul>
          </div>
          <div v-if="approvedReview" role="status" class="rounded-md border p-4 text-sm">
            <p class="font-medium">Review approved — not saved</p>
            <p class="mt-1 text-muted-foreground">
              {{ approvedReview.title }} at {{ approvedReview.company }} is ready for the UC-13 save workflow.
              Changing any field will require reapproval.
            </p>
          </div>
          <JobForm
            :key="analysis.originalText"
            :initial-value="reviewInput"
            :review-mode="true"
            :skill-catalogue="skillCatalogue"
            :submitting="loadingSkills || !!skillsError"
            submit-label="Approve review"
            @dirty="invalidateApproval"
            @submit="approveReview"
          />
        </CardContent>
      </Card>
    </template>
  </section>
</template>
