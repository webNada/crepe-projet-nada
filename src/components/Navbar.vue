<template>
  <div :class="class">
    <a href="https://terra-numerica.org">
      <img src="../../dist/assets/textures/logo-terra-numerica-300x76.png" class = "p-2 w-32" />
    </a>
  </div>
</template>
<script setup>
defineProps({
  class: String
})
</script>