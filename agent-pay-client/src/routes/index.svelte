<script>
  import { goto, prefetch } from "$app/navigation";
  import SessionStore from "../stores/SessionStore";
  import LoginTwilio from "../components/LoginTwilio.svelte";

  let loginURL = import.meta.env.VITE_FUNCTIONS_URL + "/loginMock";

  const handleLogin = (data) => {
    // update the Store
    $SessionStore = {
      identity: data.detail.identity,
      bearer: data.detail.bearer,
    };
    goto("/pay");
  };
</script>

<main>
  <h1>Twilio Demo</h1>
  <h2>Agent Assisted Pay</h2>

  <LoginTwilio authURL={loginURL} on:authorised={handleLogin} />
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
