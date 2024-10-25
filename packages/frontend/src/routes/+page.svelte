<script lang="ts">
  import { enhance } from "$app/forms";

  export let data;
</script>

{data.message}

<form use:enhance method="post">
  <input type="email" name="email" />
  <button>Log in or create account</button>
</form>
