<script>
  import { createEventDispatcher } from "svelte";

  let dispatch = createEventDispatcher();

  export let authURL;

  let identity;
  let password;
  let waiting = false;
  let authorised = false;
  let unAuthorised = false;

  let bearer;
  let response;

  const handleSubmit = async () => {
    console.log(identity);
    waiting = true;

    // New Authorization Header for username and password
    const encodedBase64Token = Buffer.from(`${identity}:${password}`).toString("base64");
    const authorization = `Basic ${encodedBase64Token}`;

    const headers = new Headers({
      method: "POST",
      Authorization: authorization,
    });
    //console.log(`headers: ${JSON.stringify(headers, null, 4)}`);

    response = await fetch(authURL, {
      headers: headers,
    });
    console.log("Response.json");
    console.log(response);

    bearer = await response.json();
    waiting = false;

    if (response.ok) {
      console.log(`Response is OK, status: ${response.status}`);

      // Notify parent that the login is authorised
      dispatch("authorised", {
        identity: identity,
        bearer: bearer,
      });
    } else {
      console.log(`Response is NOT ok, status: ${response.status}`);

      unAuthorised = true;
      if ([401, 403].includes(response.status)) {
        console.error("NOT authorized");
      }
    }
  };
</script>

{#if waiting}
  <h3>Logging in....</h3>
{/if}

{#if unAuthorised}
  <h3>Authorisation Failed. Please try again....</h3>
{/if}

<form on:submit|preventDefault={handleSubmit}>
  <input type="text" placeholder="identity" bind:value={identity} />
  <input type="password" placeholder="password" bind:value={password} />
  <button>Login</button>
</form>
<p>Log in with any identity and the password = Twilio Auth Token</p>

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
