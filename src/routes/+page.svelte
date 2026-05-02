<script lang="ts">
    import AuthChip from "$lib/components/auth/AuthChip.svelte";
    import CapturePane from "$lib/components/capture/CapturePane.svelte";
    import InboxPane from "$lib/components/inbox/InboxPane.svelte";
</script>

<div class="h-svh overflow-y-scroll snap-y snap-mandatory">
    <!-- `relative` anchors the absolutely-positioned AuthChip inside
         this section. The chip scrolls away with the section when the
         user snaps to Inbox (PRD: "chrome scrolls with Capture"). -->
    <section class="relative snap-start p-8 h-svh">
        <CapturePane />
        <!-- Chip is a *sibling* of CapturePane, not nested, so
             CapturePane keeps full ownership of its hold-to-record
             gesture geometry. Positioning is owned by the page
             (layout concern), not by the chip (presentation concern). -->
        <div class="absolute top-2 right-2 z-10">
            <AuthChip />
        </div>
    </section>
    <section class="snap-start py-4 px-6 m-0 min-h-svh">
        <InboxPane />
    </section>
</div>
