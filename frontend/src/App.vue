<script setup lang="ts">
import {
  RouterLink,
  RouterView,
} from 'vue-router';
</script>

<template>
  <header>
    <strong class="text-2xl font-bold">
      Skill Gap Analyzer
    </strong>

    <nav>
      <RouterLink to="/jobs">
        Jobs
      </RouterLink>

      <RouterLink to="/skills">
        Skills
      </RouterLink>

      <RouterLink to="/my-skills">
        My Skills
      </RouterLink>
    </nav>
  </header>

  <main>
    <RouterView />
  </main>
</template>