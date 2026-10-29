<script setup lang="ts">
import type { JobWithSkills } from '@/types/job';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{ job: JobWithSkills }>();
</script>

<template>
      <Card v-if="job.contacts?.length" class="h-fit">
        <CardHeader>
          <CardTitle>Recruitment contacts</CardTitle>
          <CardDescription>Contacts listed for this position.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="space-y-4">
            <li v-for="contact in job.contacts" :key="contact.id" class="space-y-1 text-sm">
              <p v-if="contact.name" class="font-medium">{{ contact.name }}</p>
              <p v-if="contact.role" class="text-muted-foreground">{{ contact.role }}</p>
              <p v-if="contact.email">
                <a class="text-primary underline-offset-4 hover:underline" :href="`mailto:${contact.email}`">{{ contact.email }}</a>
              </p>
              <p v-if="contact.phone">
                <a class="text-primary underline-offset-4 hover:underline" :href="`tel:${contact.phone}`">{{ contact.phone }}</a>
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
</template>
