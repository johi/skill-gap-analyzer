<script setup lang="ts">
import { computed, toRef } from 'vue';

import { getJobMatch } from '@/api/job-match';
import { useJobMatch } from '@/composables/useJobMatch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const props = defineProps<{
  jobId: number;
}>();

const { result, loading, error, loadMatch } =
    useJobMatch(toRef(props, 'jobId'));

const hasUnassessedSkills = computed(
    () => result.value?.missingInformation.includes('skill_assessments') ?? false
);

function formatMatchFactor(value: number | null): string {
  return value === null
      ? '—'
      : `${Math.round(value * 100)}%`;
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1.5">
          <CardTitle>Calculated job match</CardTitle>
          <CardDescription>
            Based on your skill assessments and this job's requirements.
          </CardDescription>
        </div>

        <Button
            variant="outline"
            size="sm"
            :disabled="loading"
            @click="loadMatch"
        >
          Refresh
        </Button>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <div v-if="loading" class="text-sm text-muted-foreground">
        Calculating job match...
      </div>

      <div v-else-if="error" class="space-y-2">
        <p class="text-sm text-destructive">
          {{ error }}
        </p>
      </div>

      <template v-else-if="result">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-lg border p-4">
            <p class="text-sm text-muted-foreground">
              Calculated match
            </p>

            <p class="mt-1 text-3xl font-semibold tabular-nums">
              {{
                result.matchPercentage === null
                    ? '—'
                    : `${result.matchPercentage}%`
              }}
            </p>

            <p class="mt-1 text-xs text-muted-foreground">
              Based on assessed requirements
            </p>
          </div>

          <div class="rounded-lg border p-4">
            <p class="text-sm text-muted-foreground">
              Assessment coverage
            </p>

            <p class="mt-1 text-3xl font-semibold tabular-nums">
              {{ result.assessmentCoverage }}%
            </p>

            <p class="mt-1 text-xs text-muted-foreground">
              Weighted by requirement importance
            </p>
          </div>
        </div>

        <p
            v-if="result.missingInformation.includes('job_skills')"
            class="text-sm text-muted-foreground"
        >
          No skill requirements have been assigned to this job.
        </p>

        <p
            v-else-if="result.matchPercentage === null"
            class="text-sm text-muted-foreground"
        >
          Assess at least one required skill to calculate a match.
        </p>

        <p
            v-else-if="hasUnassessedSkills"
            class="text-sm text-muted-foreground"
        >
          Some skills are unassessed. They are excluded from the match
          percentage, so the result may change as you complete your assessments.
        </p>

        <div v-if="result.skills.length > 0" class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">
              Skill breakdown
            </h3>

            <span class="text-xs text-muted-foreground">
              {{ result.assessedSkills }} of {{ result.totalSkills }} assessed
            </span>
          </div>

          <div class="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Proficiency</TableHead>
                  <TableHead>Match factor</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow
                    v-for="skill in result.skills"
                    :key="skill.id"
                >
                  <TableCell class="font-medium">
                    {{ skill.name }}
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

                  <TableCell>
                    {{
                      skill.proficiency === null
                          ? 'Unassessed'
                          : `${skill.proficiency}/5`
                    }}
                  </TableCell>

                  <TableCell>
                    {{ formatMatchFactor(skill.matchFactor) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <p class="text-xs text-muted-foreground">
          Must-have requirements carry twice the weight of nice-to-have
          requirements. Proficiency of 4/5 or higher fully satisfies a
          requirement.
        </p>
      </template>
    </CardContent>
  </Card>
</template>
