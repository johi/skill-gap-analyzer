<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
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
</template>
