<template>
  <div class="app">
    <p class="red">这是count</p>
    <button @click="addCount">count{{ count }}</button>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  setup() {
    const count = ref(0);

    function addCount() {
      count.value++
    }
    
    return { count, addCount }
  }
}

</script>

<style>
.red {
  color: red;
}
</style>