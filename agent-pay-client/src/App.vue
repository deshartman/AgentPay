<template>
  <PCICard />
</template>

<script>
import PCICard from "./components/pci-card.vue";

export default {
  name: "App",
  components: {
    PCICard,
  },
};
</script>

<style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
 margin-top: 60px;
} */

#app {
  display: inline-block;
  width: 100%;
}
</style>
