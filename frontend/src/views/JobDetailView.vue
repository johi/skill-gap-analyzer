<script setup lang="ts">
import {
  onMounted,
  ref,
} from 'vue';

import {
  RouterLink,
  useRoute,
  useRouter,
} from 'vue-router';

import { deleteJob, getJob } from '../api/jobs';
import { ApiError } from '../api/client';

import type { JobWithSkills } from '../types/job';
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-vue-next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const route = useRoute();
const router = useRouter();

const deleting = ref(false);

const job = ref<JobWithSkills | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  const id = Number(route.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    error.value = 'Invalid job ID';
    loading.value = false;

    return;
  }

  try {
    job.value = await getJob(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      error.value = 'Job not found';
    } else {
      error.value = err instanceof Error
          ? err.message
          : 'Unable to load job';
    }
  } finally {
    loading.value = false;
  }
});

async function handleDelete(): Promise<void> {
  if (!job.value) {
    return;
  }

  const confirmed = window.confirm(
      `Delete "${job.value.title}" at ${job.value.company}?`
  );

  if (!confirmed) {
    return;
  }

  deleting.value = true;
  error.value = null;

  try {
    await deleteJob(job.value.id);

    await router.push({
      name: 'jobs',
    });
  } catch (err) {
    error.value = err instanceof Error
        ? err.message
        : 'Unable to delete job';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-6xl space-y-6">
    <Button variant="ghost" size="sm" as-child>
      <RouterLink to="/jobs">
        <ArrowLeft class="size-4" />
        Back to jobs
      </RouterLink>
    </Button>

    <div v-if="loading" class="space-y-4">
      <Skeleton class="h-10 w-2/3" />
      <Skeleton class="h-5 w-1/3" />
      <Skeleton class="h-64 w-full" />
    </div>

    <div
        v-else-if="error"
        class="rounded-md border border-destructive/30 bg-destructive/5 p-4"
    >
      <p class="text-sm text-destructive">
        {{ error }}
      </p>
    </div>

    <template v-else-if="job">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <Badge v-if="job.applyStatus" variant="outline">
              {{ job.applyStatus }}
            </Badge>

            <Badge v-if="job.interest !== null" variant="secondary">
              {{ job.interest }}% interest
            </Badge>

            <Badge v-if="job.originalMatch !== null" variant="secondary">
              {{ job.originalMatch }}% match
            </Badge>
          </div>

          <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
            {{ job.title }}
          </h1>

          <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span class="font-medium text-foreground">
                            {{ job.company }}
                        </span>

            <span v-if="job.location" class="flex items-center gap-1">
                            <MapPin class="size-4" />
                            {{ job.location }}
                        </span>
          </div>
        </div>

        <div class="flex shrink-0 gap-2">
          <Button variant="outline" as-child>
            <RouterLink
                :to="{
                                name: 'job-edit',
                                params: { id: job.id },
                            }"
            >
              <Pencil class="size-4" />
              Edit job
            </RouterLink>
          </Button>

          <Button
              type="button"
              variant="destructive"
              :disabled="deleting"
              @click="handleDelete"
          >
            <Trash2 class="size-4" />
            {{ deleting ? 'Deleting...' : 'Delete job' }}
          </Button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle>Position details</CardTitle>

            <CardDescription>
              Requirements and employment information from the job posting.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <dt class="text-sm text-muted-foreground">
                  Date found
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.dateFound }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Location
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.location ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Work model
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.workModel ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Employment type
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.employmentType ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Seniority
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.seniority ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Primary role
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.primaryRole ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Years required
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.yearsRequired ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Danish required
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.danishRequired ?? '—' }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Salary
                </dt>
                <dd class="mt-1 text-sm font-medium">
                  {{ job.salaryRate ?? '—' }}
                </dd>
              </div>

              <div class="sm:col-span-2">
                <dt class="text-sm text-muted-foreground">
                  Education requirement
                </dt>
                <dd class="mt-1 whitespace-pre-wrap text-sm font-medium">
                  {{ job.educationRequirement ?? '—' }}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card class="h-fit">
          <CardHeader>
            <CardTitle>Assessment</CardTitle>

            <CardDescription>
              Your evaluation of this opportunity.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <dl class="space-y-5">
              <div>
                <dt class="text-sm text-muted-foreground">
                  Interest
                </dt>
                <dd class="mt-1 text-lg font-semibold">
                  {{
                    job.interest !== null
                        ? `${job.interest}%`
                        : '—'
                  }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Original match
                </dt>
                <dd class="mt-1 text-lg font-semibold">
                  {{
                    job.originalMatch !== null
                        ? `${job.originalMatch}%`
                        : '—'
                  }}
                </dd>
              </div>

              <div>
                <dt class="text-sm text-muted-foreground">
                  Application status
                </dt>
                <dd class="mt-1">
                  <Badge
                      v-if="job.applyStatus"
                      variant="outline"
                  >
                    {{ job.applyStatus }}
                  </Badge>

                  <span
                      v-else
                      class="text-sm text-muted-foreground"
                  >
                                        —
                                    </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required skills</CardTitle>

          <CardDescription>
            Skills identified in the job requirements.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
              v-if="job.skills.length === 0"
              class="rounded-lg border border-dashed p-8 text-center"
          >
            <p class="text-sm text-muted-foreground">
              No skills assigned.
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Requirement</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow
                    v-for="skill in job.skills"
                    :key="skill.id"
                >
                  <TableCell class="font-medium">
                    {{ skill.name }}
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {{ skill.category }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                        :variant="
                                                skill.requirement === 'must_have'
                                                    ? 'default'
                                                    : 'outline'
                                            "
                    >
                      {{
                        skill.requirement === 'must_have'
                            ? 'Must have'
                            : 'Nice to have'
                      }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gap notes</CardTitle>
          </CardHeader>

          <CardContent>
            <p class="whitespace-pre-wrap text-sm leading-relaxed">
              {{ job.gapNotes ?? '—' }}
            </p>
          </CardContent>
        </Card>

        <Card v-if="job.sourceUrl" class="h-fit">
          <CardHeader>
            <CardTitle>Source</CardTitle>

            <CardDescription>
              View the original job advertisement.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button variant="outline" as-child>
              <a
                  :href="job.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
              >
                <ExternalLink class="size-4" />
                Original job advertisement
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Original job posting</CardTitle>

          <CardDescription>
            Original text retained for reference and later analysis.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <p class="whitespace-pre-wrap text-sm leading-relaxed">
            {{ job.originalText ?? '—' }}
          </p>
        </CardContent>
      </Card>
    </template>
  </section>
</template>