import { writable } from "svelte/store";

const SessionStore = writable({
    identity: "",
    password: "",
    bearer: "",
});

export default SessionStore;

