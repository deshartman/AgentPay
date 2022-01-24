<script context="module">
  // let functionsURL = import.meta.env.VITE_FUNCTIONS_URL;

  // // Generate the JWT token based on the identity
  // export async function load(context) {
  //   const res = await context.fetch(functionsURL + "/getSyncToken?" + new URLSearchParams({ identity: "Alice" }));
  //   const syncToken = await res.json();

  //   if (res.ok) {
  //     console.log(`Sync Token: ${syncToken}`);
  //     return {
  //       props: { syncToken: syncToken.data },
  //     };
  //   }

  //   return {
  //     status: res.status,
  //     error: new Error(`Failed to get sync token: ${res.status} ${res.statusText}`),
  //   };
  // }
</script>

<script>
  import { goto, prefetch } from "$app/navigation";
  import SessionStore from "../stores/SessionStore";

  let functionsURL = import.meta.env.VITE_FUNCTIONS_URL;
  let identity;
  let password;
  let bearer;
  let response;
  let waiting = false;

  const handleSubmit = async () => {
    console.log(identity, password);
    waiting = true;

    response = await fetch(functionsURL + "/getSyncToken?" + new URLSearchParams({ identity: identity }));
    const syncToken = await response.json();

    if (response.ok) {
      //console.log(`Sync Token: ${syncToken}`);
      // update the Store
      $SessionStore = {
        identity: identity,
        password: password,
        bearer: syncToken,
      };

      goto("/pay");
    } else {
      throw new Error(`Failed to get sync token: ${response.status} ${response.statusText}`);
    }
  };
</script>

<main>
  <h1>Twilio Demo</h1>
  <h2>Agent Assisted Pay</h2>

  {#if waiting}
    <h3>Logging in....</h3>
  {/if}

  <form on:submit|preventDefault={handleSubmit}>
    <input type="text" placeholder="identity" bind:value={identity} />
    <input type="text" placeholder="password" bind:value={password} />
    <button>Login</button>
  </form>
  <p>Log in with any identity and password</p>
</main>

<style>
  main {
    text-align: center;
  }

  button {
    background-color: red;
    color: white;
    padding: 5px 20px;
    margin: 10px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
  }
</style>
