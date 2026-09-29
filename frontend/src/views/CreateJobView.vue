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
  <section>
    <p>
      <RouterLink to="/jobs">
        ← Back to jobs
      </RouterLink>
    </p>

    <h1>Create job</h1>

    <p v-if="error">
      {{ error }}
    </p>

    <ul v-if="validationErrors.length">
      <li
          v-for="validationError in validationErrors"
          :key="validationError"
      >
        {{ validationError }}
      </li>
    </ul>

    <JobForm
        :submitting="submitting"
        @submit="handleSubmit"
    />
  </section>
</template>