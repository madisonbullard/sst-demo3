<script lang="ts">
  import { enhance } from "$app/forms";
</script>

<svelte:head>
  <title>Verify Email</title>
  <meta name="description" content="Verify your email address to sign in" />
</svelte:head>

<h1>Verify email address</h1>
<form use:enhance method="post">
  <input name="code" type="text" />
  <button type="submit">Verify</button>
</form>
