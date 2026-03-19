"use client";

import { useState } from "react";
import { useApiKey } from "@/lib/hooks/use-api-key";
import { useElevenLabsKey } from "@/lib/hooks/use-elevenlabs-key";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  const { apiKey, setApiKey, hasUserKey, isLoaded } = useApiKey();
  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // ElevenLabs key state
  const {
    apiKey: elevenLabsKey,
    setApiKey: setElevenLabsKey,
    hasUserKey: hasElevenLabsKey,
  } = useElevenLabsKey();
  const [elInputValue, setElInputValue] = useState("");
  const [showElKey, setShowElKey] = useState(false);
  const [elSaved, setElSaved] = useState(false);

  function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setInputValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleRemove() {
    setApiKey(null);
    setInputValue("");
  }

  function handleElSave() {
    const trimmed = elInputValue.trim();
    if (!trimmed) return;
    setElevenLabsKey(trimmed);
    setElInputValue("");
    setElSaved(true);
    setTimeout(() => setElSaved(false), 2000);
  }

  function handleElRemove() {
    setElevenLabsKey(null);
    setElInputValue("");
  }

  if (!isLoaded) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8 overflow-y-auto">
      <h1 className="mb-2 text-2xl font-bold text-slate-100">Settings</h1>
      <p className="mb-8 text-slate-400">
        Configure your Unbottle experience.
      </p>

      <Card className="p-4 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-100">
          Anthropic API Key
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Unbottle uses Claude to power the AI producer. You can use your own
          Anthropic API key, or use the default server key if available.
        </p>

        {hasUserKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-emerald-400">
                      Your key is active
                    </span>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {showKey
                        ? apiKey
                        : `${apiKey?.slice(0, 12)}...${apiKey?.slice(-4)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleRemove}>
              Remove Key
            </Button>
            <p className="text-xs text-slate-500">
              Removing your key will fall back to the server&apos;s default key
              (if one is configured).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="mb-3 text-sm text-slate-300">
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  console.anthropic.com
                </a>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <Button onClick={handleSave} disabled={!inputValue.trim()} className="min-h-[44px] sm:min-h-0 shrink-0">
                  {saved ? "Saved!" : "Save"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Your key is stored locally in your browser. It&apos;s never sent
              anywhere except Anthropic&apos;s API.
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-100">
          ElevenLabs API Key
        </h2>
        <p className="mb-4 text-sm text-slate-400">
          Unbottle uses ElevenLabs to generate AI audio. Provide your own API
          key to enable audio generation, or use the default server key if
          available.
        </p>

        {hasElevenLabsKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-emerald-400">
                      Your key is active
                    </span>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {showElKey
                        ? elevenLabsKey
                        : `${elevenLabsKey?.slice(0, 12)}...${elevenLabsKey?.slice(-4)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowElKey(!showElKey)}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    {showElKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={handleElRemove}>
              Remove Key
            </Button>
            <p className="text-xs text-slate-500">
              Removing your key will fall back to the server&apos;s default key
              (if one is configured).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="mb-3 text-sm text-slate-300">
                Get your API key from{" "}
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  elevenlabs.io
                </a>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="xi-..."
                  value={elInputValue}
                  onChange={(e) => setElInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleElSave()}
                />
                <Button onClick={handleElSave} disabled={!elInputValue.trim()} className="min-h-[44px] sm:min-h-0 shrink-0">
                  {elSaved ? "Saved!" : "Save"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Your key is stored locally in your browser. It&apos;s never sent
              anywhere except ElevenLabs&apos; API.
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-4 p-4 sm:mt-6 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-100">
          How it works
        </h2>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="text-indigo-400">1.</span>
            If you provide your own key, all AI requests use your Anthropic
            account directly.
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400">2.</span>
            If you have a Claude Pro/Team subscription, you can generate an API
            key at console.anthropic.com — your subscription credits apply.
          </li>
          <li className="flex gap-2">
            <span className="text-indigo-400">3.</span>
            If no key is set, Unbottle uses a shared server key (when
            available).
          </li>
        </ul>
      </Card>
    </div>
  );
}
