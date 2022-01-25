import { writable } from "svelte/store";

const SessionStore = writable({
    identity: "",
    bearer: "",
});

export default SessionStore;

