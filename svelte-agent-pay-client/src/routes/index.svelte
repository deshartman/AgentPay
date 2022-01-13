<script context="module">
  let functionsURL = import.meta.env.VITE_FUNCTIONS_URL;

  // Generate the JWT token based on the identity
  export async function load(context) {
    const res = await context.fetch(functionsURL + "/getSyncToken?" + new URLSearchParams({ identity: "Alice" }));
    const syncToken = await res.json();

    if (res.ok) {
      console.log(`Sync Token: ${syncToken}`);
      return {
        props: { syncToken: syncToken.data },
      };
    }

    return {
      status: res.status,
      error: new Error(`Failed to get sync token: ${res.status} ${res.statusText}`),
    };
  }
</script>

<script>
  import { goto } from "$app/navigation";
  import SessionStore from "../stores/SessionStore";

  let identity;
  let password;
  let bearer;

  const handleSubmit = () => {
    console.log(identity, password);
    // update the Store
    $SessionStore = {
      identity: identity,
      password: password,
      bearer: "TESTTOKEN",
    };

    console.log("store value now: ", identity, password);

    goto("/pay");
  };
</script>

<main>
  <h1>Twilio Demo</h1>
  <h2>Agent Assisted Pay</h2>

  <form on:submit|preventDefault={handleSubmit}>
    <input type="text" placeholder="identity" bind:value={identity} />
    <input type="text" placeholder="password" bind:value={password} />
    <button>Login</button>
  </form>
  <p>Log in with any identity and password (No spaces or special characters like "@")</p>
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
