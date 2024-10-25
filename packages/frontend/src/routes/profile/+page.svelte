<script lang="ts">
  import type { PageData } from "./$types";

  export let data: PageData;

  $: jsonprettify = JSON.stringify(data, null, 2);
</script>

<h1>Profile</h1>
<pre>{@html jsonprettify}</pre>
