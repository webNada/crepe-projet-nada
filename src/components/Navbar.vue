<template>
    <div :class="class">
    <img src="../../dist/assets/textures/logo-terra-numerica-300x76.png" class = "p-2 w-32"/>
  </div>
</template>
<script setup>
defineProps({
  class: String
})
</script>