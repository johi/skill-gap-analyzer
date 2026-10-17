<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
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
              Language requirements
            </dt>

            <dd class="mt-1 flex flex-wrap gap-2">
              <span
                  v-if="job.languageRequirements.length === 0"
                  class="text-sm font-medium"
              >
                —
              </span>

              <Badge
                  v-for="languageRequirement in job.languageRequirements"
                  v-else
                  :key="languageRequirement.language"
                  variant="outline"
              >
                {{ languageRequirement.language.toUpperCase() }}
                ·
                {{
                  languageRequirement.requirement === 'required'
                      ? 'Required'
                      : 'Preferred'
                }}
              </Badge>
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
</template>
