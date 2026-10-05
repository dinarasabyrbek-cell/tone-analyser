"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { Pebbles } from "@/components/Shapes";
import { Button, ConfirmButton, ErrorBox, Loading, cx } from "@/components/ui";
import { postStream } from "@/lib/client/api";
import { loadContext } from "@/lib/client/data";
import { useLoad } from "@/lib/client/useLoad";
import { getStore } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "How is my health overall?",
  "Why might I feel tired all the time?",
  "What should I eat this week?",
  "Am I drinking enough water?",
  "Which supplements are worth discussing with my doctor?",
  "What changed since my last tests?",
];

export default function CoachPage() {
  return (
    <Suspense>
      <Coach />
    </Suspense>
  );
}

function Coach() {
  const store = getStore();
  const params = useSearchParams();
  const { data: messages, setData: setMessages, error, loading, reload } = useLoad(() => store.listMessages());
  const [input, setInput] = useState(params.get("q") ?? "");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length, streaming]);

  if (loading) return <Loading />;
  if (error || !messages) return <ErrorBox onRetry={reload}>{error}</ErrorBox>;

  async function send(text: string) {
    const q = text.trim();
    if (!q || streaming !== null) return;
    setInput("");
    setSendError(null);
    const userMsg = await store.addMessage({ role: "user", content: q });
    const history = [...messages!, userMsg];
    setMessages(history);
    setStreaming("");
    try {
      const { context } = await loadContext();
      const answer = await postStream(
        "/api/coach",
        { context, messages: history.map(({ role, content }) => ({ role, content })) },
        setStreaming
      );
      const saved = await store.addMessage({ role: "assistant", content: answer.trim() || "(no answer)" });
      setMessages((m) => [...(m ?? []), saved]);
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setStreaming(null);
    }
  }

  async function clear() {
    await store.clearMessages();
    setMessages([]);
  }

  const empty = messages.length === 0 && streaming === null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h1 className="display text-4xl sm:text-5xl">
          Your <em>coach</em>
        </h1>
        {!empty && (
          <ConfirmButton onConfirm={clear} confirmLabel="Tap again to clear" className="text-xs text-noir/50 underline">
            Clear chat
          </ConfirmButton>
        )}
      </div>

      {empty && (
        <div className="hero-bg relative mb-6 overflow-hidden rounded-5xl px-6 py-10 text-center">
          <div className="glass mx-auto flex aspect-square max-w-[17rem] flex-col items-center justify-center rounded-full p-8">
            <Pebbles className="mb-3 text-moss" />
            <p className="display text-xl leading-snug">
              Ask anything about <em>your</em> body.
            </p>
            <p className="mt-2 text-[11px] text-noir/55">I can see your labs, profile, meals and water.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {streaming !== null && (
          <Bubble m={{ id: "s", role: "assistant", content: streaming, created_at: "" }} pending={streaming === ""} />
        )}
        <div ref={bottom} />
      </div>

      {sendError && (
        <div className="mt-3">
          <ErrorBox>{sendError}</ErrorBox>
        </div>
      )}

      {empty && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-kombu/25 bg-[#fffaf2] px-3.5 py-1.5 text-sm text-kombu hover:bg-sage-100">
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-24 mt-6 flex items-end gap-2 rounded-4xl border border-noir/10 bg-[#fffaf2] p-2 shadow-[0_10px_30px_rgba(53,64,36,0.12)] md:bottom-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask about your health…"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none"
          aria-label="Message"
        />
        <Button type="submit" disabled={!input.trim()} loading={streaming !== null} className="!px-4">
          Send
        </Button>
      </form>
    </div>
  );
}

function Bubble({ m, pending }: { m: ChatMessage; pending?: boolean }) {
  const mine = m.role === "user";
  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[88%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed",
          mine ? "rounded-br-md bg-kombu text-cream" : "rounded-bl-md bg-[#fffaf2] text-noir shadow-[0_2px_10px_rgba(53,64,36,0.06)]"
        )}
      >
        {pending ? <span className="text-sm text-moss">Thinking…</span> : mine ? m.content : <Markdown text={m.content} />}
      </div>
    </div>
  );
}
