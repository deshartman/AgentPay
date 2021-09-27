<template>
  <PCICard />
</template>

<script>
// Select one of the two views:
import PCICard from "./components/pci-card.vue";
//import PCICard from "./components/pci-card-min.vue";

export default {
  name: "App",
  components: {
    PCICard,
  },
};
</script>

<style>
#app {
  display: inline-block;
  width: 100%;
}
</style>
