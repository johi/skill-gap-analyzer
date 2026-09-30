<script setup lang="ts">
import {
  BriefcaseBusiness,
  Plus,
} from 'lucide-vue-next';

import {
  onMounted,
  ref,
} from 'vue';

import { RouterLink } from 'vue-router';

import { getJobs } from '../api/jobs';
import type { Job } from '../types/job';

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

const jobs = ref<Job[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    jobs.value = await getJobs();
  } catch (err) {
    error.value = err instanceof Error
        ? err.message
        : 'Unable to load jobs';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="space-y-6">
    <div
        class="
                flex flex-col gap-4
                sm:flex-row sm:items-center sm:justify-between
            "
    >
      <div>
        <h1
            class="
                        text-2xl font-semibold tracking-tight
                        sm:text-3xl
                    "
        >
          Jobs
        </h1>

        <p class="mt-1 text-sm text-muted-foreground">
          Track job opportunities and compare their
          requirements with your skills.
        </p>
      </div>

      <Button as-child>
        <RouterLink :to="{ name: 'job-create' }">
          <Plus class="size-4" />
          Create job
        </RouterLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div
              class="
                            flex size-9 items-center justify-center
                            rounded-lg bg-muted
                        "
          >
            <BriefcaseBusiness class="size-4" />
          </div>

          <div>
            <CardTitle>Job opportunities</CardTitle>

            <CardDescription>
              Jobs currently tracked by the analyzer.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
            v-if="loading"
            class="space-y-3"
        >
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>

        <div
            v-else-if="error"
            class="
                        rounded-md border border-destructive/30
                        bg-destructive/5 p-4
                    "
        >
          <p class="text-sm text-destructive">
            {{ error }}
          </p>
        </div>

        <div
            v-else-if="jobs.length === 0"
            class="
                        flex flex-col items-center justify-center
                        py-12 text-center
                    "
        >
          <div
              class="
                            mb-4 flex size-12 items-center
                            justify-center rounded-full bg-muted
                        "
          >
            <BriefcaseBusiness
                class="
                                size-5 text-muted-foreground
                            "
            />
          </div>

          <h2 class="font-medium">
            No jobs yet
          </h2>

          <p
              class="
                            mt-1 max-w-sm text-sm
                            text-muted-foreground
                        "
          >
            Add your first job opportunity to start
            comparing requirements with your skills.
          </p>

          <Button
              class="mt-4"
              as-child
          >
            <RouterLink
                :to="{ name: 'job-create' }"
            >
              <Plus class="size-4" />
              Create job
            </RouterLink>
          </Button>
        </div>

        <div
            v-else
            class="overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              <TableRow
                  v-for="job in jobs"
                  :key="job.id"
              >
                <TableCell
                    class="
                                        whitespace-nowrap
                                        text-muted-foreground
                                    "
                >
                  {{ job.dateFound }}
                </TableCell>

                <TableCell class="font-medium">
                  {{ job.company }}
                </TableCell>

                <TableCell>
                  <RouterLink
                      class="
                                            font-medium
                                            hover:underline
                                        "
                      :to="{
                                            name: 'job-detail',
                                            params: {
                                                id: job.id,
                                            },
                                        }"
                  >
                    {{ job.title }}
                  </RouterLink>
                </TableCell>

                <TableCell>
                  {{ job.location ?? '—' }}
                </TableCell>

                <TableCell>
                  <Badge
                      v-if="job.interest !== null"
                      variant="secondary"
                  >
                    {{ job.interest }}%
                  </Badge>

                  <span
                      v-else
                      class="text-muted-foreground"
                  >
                                        —
                                    </span>
                </TableCell>

                <TableCell>
                  <Badge
                      v-if="job.applyStatus"
                      variant="outline"
                  >
                    {{ job.applyStatus }}
                  </Badge>

                  <span
                      v-else
                      class="text-muted-foreground"
                  >
                                        —
                                    </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </section>
</template>