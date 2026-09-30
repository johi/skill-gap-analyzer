<script setup lang="ts">
import { ref } from 'vue';
import {
  RouterLink,
  useRouter,
} from 'vue-router';

import JobForm from '../components/JobForm.vue';

import { createJob } from '../api/jobs';
import { ApiError } from '../api/client';

import type { CreateJobInput } from '../types/job';
import { ArrowLeft } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const router = useRouter();

const submitting = ref(false);
const error = ref<string | null>(null);
const validationErrors = ref<string[]>([]);

async function handleSubmit(
    input: CreateJobInput
): Promise<void> {
  submitting.value = true;
  error.value = null;
  validationErrors.value = [];

  try {
    const job = await createJob(input);

    await router.push({
      name: 'job-detail',
      params: {
        id: job.id,
      },
    });
  } catch (err) {
    if (
        err instanceof ApiError &&
        err.error === 'validation_error'
    ) {
      validationErrors.value = err.issues.map(
          (issue) =>
              issue.path
                  ? `${issue.path}: ${issue.message}`
                  : issue.message
      );

      return;
    }

    error.value = err instanceof Error
        ? err.message
        : 'Unable to create job';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-4xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/jobs">
        <ArrowLeft class="size-4" />
        Back to jobs
      </RouterLink>
    </Button>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Create job
      </h1>

      <p class="mt-1 text-sm text-muted-foreground">
        Add a job opportunity and its requirements to the analyzer.
      </p>
    </div>

    <div
        v-if="error"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="text-sm text-destructive">
        {{ error }}
      </p>
    </div>

    <div
        v-if="validationErrors.length"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="mb-2 text-sm font-medium text-destructive">
        Please correct the following:
      </p>

      <ul class="list-disc space-y-1 pl-5 text-sm text-destructive">
        <li
            v-for="validationError in validationErrors"
            :key="validationError"
        >
          {{ validationError }}
        </li>
      </ul>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Job details</CardTitle>

        <CardDescription>
          Enter the information from the job posting.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <JobForm
            :submitting="submitting"
            @submit="handleSubmit"
        />
      </CardContent>
    </Card>
  </section>
</template>