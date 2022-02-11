<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import SessionStore from "../stores/SessionStore";

  onMount(() => {
    if (!$SessionStore.bearer) {
      goto("/");
    }
  });
</script>

{#if $SessionStore.bearer}
  <slot />
{:else}
  <p>Loading. No bearer Auth found...</p>
{/if}
