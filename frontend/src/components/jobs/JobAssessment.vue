<script setup lang="ts">
import { applicationStatusLabels } from '@/lib/job-labels';
import type { JobWithSkills } from '@/types/job';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
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
              Application status
            </dt>
            <dd class="mt-1">
              <Badge
                  v-if="job.applyStatus"
                  variant="outline"
              >
                {{ applicationStatusLabels[job.applyStatus] }}
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
</template>
