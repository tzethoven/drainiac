<script lang="ts">
    import CapturePane from "$lib/components/capture/CapturePane.svelte";
    import InboxPane from "$lib/components/inbox/InboxPane.svelte";
</script>

<div class="h-svh overflow-y-scroll snap-y snap-mandatory">
    <section class="snap-start p-8 h-svh">
        <CapturePane />
    </section>
    <section class="snap-start py-4 px-6 m-0 min-h-svh">
        <InboxPane />
    </section>
</div>
