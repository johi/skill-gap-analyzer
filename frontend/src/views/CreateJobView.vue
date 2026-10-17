<script setup lang="ts">
import {
  RouterLink,
} from 'vue-router';

import JobForm from '../components/JobForm.vue';

import { createJob } from '../api/jobs';
import { useJobFormSubmit } from '@/composables/useJobFormSubmit';

import { ArrowLeft } from 'lucide-vue-next';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const { submitting, error, validationErrors, handleSubmit } =
  useJobFormSubmit(createJob, 'Unable to create job');
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