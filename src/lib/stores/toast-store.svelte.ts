import type { Entry } from "$lib/stores/entries-store.svelte";
import { getContext, setContext } from "svelte";

export interface ToastStore {
  readonly message: string | null;
  readonly undoEntry: Entry | null;
  show(message: string, undoEntry: Entry): void;
  dismiss(): void;
}

export function createToastStore(): ToastStore {
  let message = $state<string | null>(null);
  let undoEntry = $state<Entry | null>(null);
  let timerId: ReturnType<typeof setTimeout> | null = null;

  function show(msg: string, entry: Entry): void {
    if (timerId !== null) clearTimeout(timerId);
    message = msg;
    undoEntry = entry;
    timerId = setTimeout(dismiss, 5_000);
  }

  function dismiss(): void {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    message = null;
    undoEntry = null;
  }

  return {
    get message() {
      return message;
    },
    get undoEntry() {
      return undoEntry;
    },
    show,
    dismiss,
  };
}

const TOAST_CONTEXT_KEY = Symbol("drainiac:toast-store");

export function setToastContext(store: ToastStore): ToastStore {
  setContext(TOAST_CONTEXT_KEY, store);
  return store;
}

export function getToastContext(): ToastStore {
  const store = getContext<ToastStore | undefined>(TOAST_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      "No toast store in context. Wrap the component tree with a provider that calls setToastContext().",
    );
  }
  return store;
}
