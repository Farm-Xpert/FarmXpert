'use client';

// ============================================================
// FILE: src/components/dashboard/Assistant.jsx
//
// Ask FarmXpert - typed or spoken, in any Indian language.
//   typed:  /chat/ask (streamed): the answer appears as it is written
//   spoken: hold the mic, release: transcript, then the answer is
//           shown AND spoken sentence by sentence
// The farm and field come from the dashboard, so every answer is
// about this farmer's land. The app locale is only a language hint.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowUp, AudioLines, MessagesSquare, Mic, Plus, Square, Volume2, X } from '@/components/ui/icons';
import { LogoMark } from '@/components/ui/Logo';

import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import { useFarm } from '@/context/FarmContext';
import useAudioQueue from '@/hooks/useAudioQueue';
import { ApiError, askText } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AgentCredits, RevealText, ThinkingLabel } from './AnswerParts';
import AgentPicker from './AgentPicker';
import ChatHistory from './ChatHistory';
import { api } from '@/lib/api';
import { useApi } from '@/hooks/useApi';

// unique across hot reloads and restored threads (a module counter restarts at m1 and collides)
const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export default function Assistant() {
  const t = useTranslations('dashboard.assistant');
  const o = useTranslations('dashboard.overview');
  const { user } = useAuth();
  const locale = useLocale();
  const search = useSearchParams();
  const { farm, field } = useFarm();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(() => search.get('q') || '');
  const [busy, setBusy] = useState(false);
  const [agent, setAgent] = useState('auto');      // 'auto' = the orchestrator picks the experts
  const [notice, setNotice] = useState(null);
  const conversationId = useRef(null);
  const abort = useRef(null);
  const listEnd = useRef(null);
  const player = useAudioQueue();
  // past chats (typed and voice), newest first
  const history = useApi('/conversations?limit=50');
  const [activeId, setActiveId] = useState(null);
  const [opening, setOpening] = useState(false);
  const [drawer, setDrawer] = useState(false);

  // Follow the answer as it is written, but only while the farmer is at the
  // bottom: scrolling up to read stops the following, and coming back (or the
  // "latest" button) resumes it. The page itself scrolls, not a box.
  const pinned = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const toBottom = useCallback((smooth = false) => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const gap = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      // moving up means the farmer wants to read: let go at once
      if (window.scrollY < lastY - 2) pinned.current = false;
      if (gap < 80) pinned.current = true;
      lastY = window.scrollY;
      setAtBottom(gap < 80);
    };
    const onWheel = (e) => { if (e.deltaY < 0) pinned.current = false; };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onWheel, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onWheel);
    };
  }, []);
  const follow = useCallback(() => { if (pinned.current) toBottom(); }, [toBottom]);
  // a new question always brings the thread to its end
  useEffect(() => { pinned.current = true; toBottom(true); }, [messages.length, toBottom]);
  useEffect(() => () => abort.current?.abort(), []);

  const errorText = useCallback((code) => (t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.generic')), [t]);
  const update = useCallback((id, patch) => {
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)));
  }, []);

  const handlerFor = useCallback((farmerId, answerId) => (event, data) => {
    if (event === 'conversation') {
      conversationId.current = data.conversation_id;
      setActiveId(data.conversation_id);
      // put the chat in the URL (so the sidebar marks it) without reloading the page
      window.history.replaceState(null, '', `${window.location.pathname}?c=${data.conversation_id}`);
    }
    else if (event === 'transcript') update(farmerId, { text: data.text, pending: false });
    else if (event === 'delta') update(answerId, (m) => ({ text: m.text + data.text, pending: false, streaming: true }));
    else if (event === 'audio') player.enqueue(data);
    else if (event === 'done') {
      update(answerId, (m) => ({ text: data.answer || m.text || data.summary || t('noAnswer'), pending: false, streaming: false,
        language: data.understanding?.language, agents: Object.keys(data.results || {}) }));
    } else if (event === 'error') update(answerId, { text: errorText(data.code), pending: false, streaming: false, failed: true });
  }, [errorText, player, t, update]);

  const run = useCallback(async (farmerMessage, send) => {
    const answerId = newId();
    setMessages((all) => [...all, farmerMessage, { id: answerId, role: 'assistant', text: '', pending: true }]);
    setBusy(true);
    setNotice(null);
    abort.current?.abort();
    abort.current = new AbortController();
    try {
      await send(handlerFor(farmerMessage.id, answerId), abort.current.signal);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      update(answerId, { text: errorText(err instanceof ApiError ? err.code : 'network'), pending: false, streaming: false, failed: true });
      if (farmerMessage.pending) update(farmerMessage.id, { text: t('voiceNotHeard'), pending: false });
    } finally {
      setBusy(false);
      history.reload();                 // the new or renamed chat moves to the top
      window.dispatchEvent(new Event('fx-chats'));
    }
  }, [errorText, handlerFor, history, t, update]);

  // reopen a past chat: its messages, oldest first, shown whole (no typing reveal)
  const openChat = useCallback(async (c) => {
    setDrawer(false);
    if (c.id === conversationId.current) return;
    abort.current?.abort();
    player.stop();
    setOpening(true);
    setActiveId(c.id);
    conversationId.current = c.id;
    try {
      const page = await api.get(`/conversations/${c.id}/messages?limit=100`);
      setMessages([...page.items].reverse().map((m) => ({
        id: `h${m.id}`, role: m.role === 'farmer' ? 'farmer' : 'assistant', text: m.content,
        language: m.language, voice: m.input_mode === 'voice', restored: true,
      })));
    } catch {
      setNotice(t('errors.generic'));
    } finally {
      setOpening(false);
    }
  }, [player, t]);

  // the sidebar opens a chat with ?c=<id>, and starts a new one with ?new=<n>
  const cParam = search.get('c');
  const newParam = search.get('new');
  useEffect(() => {
    if (cParam && cParam !== conversationId.current) openChat({ id: cParam });
  }, [cParam, openChat]);

  const newChat = useCallback(() => {
    setDrawer(false);
    abort.current?.abort();
    player.stop();
    conversationId.current = null;
    setActiveId(null);
    setMessages([]);
    setNotice(null);
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, [player]);
  useEffect(() => {
    if (!newParam) return undefined;
    const id = requestAnimationFrame(newChat);      // after the navigation has settled
    return () => cancelAnimationFrame(id);
  }, [newParam, newChat]);

  const context = () => ({ farmId: farm?.id, fieldId: field?.id, conversationId: conversationId.current, language: locale,
    ...(agent !== 'auto' && { agents: [agent] }) });

  const sendText = (text = draft) => {
    const query = text.trim();
    if (!query || busy) return;
    setDraft('');
    player.stop();
    run({ id: newId(), role: 'farmer', text: query }, (onEvent, signal) => askText({ query, ...context() }, onEvent, signal));
  };

  // short labels on the chips; tapping one asks the full question
  const suggestions = ['water', 'fertiliser', 'weather', 'pest'].map((k) => ({ key: k, label: t(`suggestShort.${k}`), query: t(`suggest.${k}`) }));

  const firstName = (user?.name || '').split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = o(`greeting.${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}`);
  const empty = messages.length === 0;

  const composer = (
    <form onSubmit={(e) => { e.preventDefault(); sendText(); }}
      className="rounded-[1.6rem] border border-line bg-surface p-2 shadow-card transition-shadow focus-within:border-leaf/40 focus-within:shadow-lift">
      <textarea value={draft} rows={1} maxLength={2000} 
        onChange={(e) => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); } }}
        placeholder={t('placeholder')} aria-label={t('placeholder')}
        className="block max-h-[200px] min-h-[2.75rem] w-full resize-none bg-transparent px-3 pt-2.5 text-[1rem] leading-relaxed text-ink placeholder:text-faint focus:outline-none" />
      <div className="flex items-center justify-between gap-2 px-1 pt-1">
        <AgentPicker value={agent} onChange={setAgent} farmName={farm?.name} />
        <div className="flex items-center gap-1.5">
          {player.speaking && (
            <button type="button" onClick={player.stop} aria-label={t('stopSpeaking')}
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-sage hover:text-ink">
              <Volume2 className="size-4" />
            </button>
          )}
          <Link href="/dashboard/voice" aria-label={t('voiceMode')} title={t('voiceMode')}
            className="grid size-9 place-items-center rounded-full bg-forest text-on-forest transition-transform hover:scale-105">
            <AudioLines className="size-[1.1rem]" />
          </Link>
          <button type="submit" disabled={busy || !draft.trim()} aria-label={t('send')}
            className="grid size-9 place-items-center rounded-full bg-forest text-on-forest transition-all hover:opacity-90 disabled:bg-line disabled:text-faint">
            {busy ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-[1.1rem]" />}
          </button>
        </div>
      </div>
    </form>
  );

  const rail = (
    <ChatHistory items={history.data?.items} loading={history.loading} activeId={activeId} onPick={openChat} onNew={newChat} />
  );

  const body = opening ? (
    <div className="mx-auto w-full max-w-3xl space-y-8 pt-2" role="status" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-8">
          <div className="flex justify-end"><div className="skeleton h-11 w-2/5 rounded-3xl" /></div>
          <div className="flex gap-4">
            <div className="skeleton h-6 w-5 rounded-md" />
            <div className="flex-1 space-y-2.5">
              <div className="skeleton h-3 w-full rounded-full" /><div className="skeleton h-3 w-11/12 rounded-full" /><div className="skeleton h-3 w-3/5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : empty ? (
      <div className="mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-2xl flex-col justify-center pb-10 lg:min-h-[calc(100dvh-8rem)]">
        <div className="mb-8 text-center animate-rise">
          <LogoMark className="mx-auto mb-4 h-12" />
          <h1 className="text-[2.2rem] leading-tight text-ink sm:text-[2.6rem]">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 text-muted">{t('emptyText')}</p>
        </div>
        {composer}
        <div className="no-scrollbar mt-3 flex flex-nowrap justify-start gap-1 overflow-x-auto sm:justify-center">
          {suggestions.map((s) => (
            <button key={s.key} type="button" onClick={() => sendText(s.query)} title={s.query}
              className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-[0.72rem] whitespace-nowrap text-muted transition-colors hover:border-leaf/40 hover:text-ink">
              {s.label}
            </button>
          ))}
        </div>
        {notice && <p className="mt-4 text-center text-sm text-muted" role="status">{notice}</p>}
      </div>
  ) : (
    <div className="mx-auto flex min-h-[calc(100dvh-14rem)] w-full max-w-3xl flex-col lg:min-h-[calc(100dvh-8rem)]">
      <ol className="flex-1 space-y-8 pb-8" aria-live="polite">
        {messages.map((m) => (m.role === 'farmer' ? (
          <li key={m.id} className="flex justify-end animate-rise">
            <div className="max-w-[80%] rounded-3xl bg-raised px-5 py-3 text-[1rem] leading-relaxed whitespace-pre-wrap text-ink ring-1 ring-line">
              {m.voice && <Mic className="mr-1.5 inline size-3.5 text-faint" aria-label={t('spoken')} />}
              {m.text}
            </div>
          </li>
        ) : (
          <li key={m.id} lang={m.language || undefined} className="flex gap-4 animate-rise">
            {/* same height as the first text line, so the logo sits level with it */}
            <span className="grid h-8 w-6 shrink-0 place-items-center" aria-hidden>
              <LogoMark className="h-6" />
            </span>
            <div className="min-w-0 flex-1">
              {m.pending && !m.text ? <ThinkingLabel />
                : m.failed ? <p className="text-[1rem] text-danger">{m.text}</p>
                  : <RevealText text={m.text} streaming={!!m.streaming} onGrow={follow} instant={!!m.restored} />}
              {!m.streaming && <AgentCredits agents={m.agents} />}
            </div>
          </li>
        )))}
        <li ref={listEnd} aria-hidden className="h-4" />
      </ol>

      <div className="sticky bottom-20 z-20 -mx-2 bg-gradient-to-t from-canvas from-70% to-transparent px-2 pt-8 pb-3 lg:bottom-0">
        {!atBottom && (
          <button type="button" onClick={() => { pinned.current = true; toBottom(true); }} aria-label={t('latest')}
            className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-ink shadow-card transition-colors hover:border-leaf/40">
            <ArrowUp className="size-3.5 rotate-180" aria-hidden />{t('latest')}
          </button>
        )}
        {composer}
        {notice && <p className="mt-2 text-center text-sm text-muted" role="status">{notice}</p>}
      </div>
    </div>
  );

  return (
    <div>
      <div className="min-w-0">
        {/* without the sidebar (phones, tablets): chats and new chat, above the thread */}
        <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
          <button type="button" onClick={() => setDrawer(true)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm text-ink">
            <MessagesSquare className="size-4 text-leaf" aria-hidden />{t('history.title')}
          </button>
          <button type="button" onClick={newChat} aria-label={t('history.new')} title={t('history.new')}
            className="grid size-9 place-items-center rounded-full border border-line bg-surface text-ink">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        {body}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('history.title')}>
          <button type="button" className="absolute inset-0 bg-black/30" aria-label={t('history.close')} onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-canvas p-5 shadow-lift animate-rise">
            <button type="button" onClick={() => setDrawer(false)} aria-label={t('history.close')}
              className="mb-3 grid size-8 place-items-center self-end rounded-full text-muted hover:bg-raised">
              <X className="size-4" />
            </button>
            {rail}
          </div>
        </div>
      )}
    </div>
  );
}
