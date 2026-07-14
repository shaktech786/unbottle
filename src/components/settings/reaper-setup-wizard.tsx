"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReaperBackend } from "@/lib/daw/backends/reaper-backend";

function detectOS(): "mac" | "win" | "linux" {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform ?? "").toLowerCase();
  if (platform.includes("win") || ua.includes("windows")) return "win";
  if (platform.includes("linux") || ua.includes("linux")) return "linux";
  return "mac";
}

const OS_PATHS: Record<"mac" | "win" | "linux", string> = {
  mac: "~/Library/Application Support/REAPER/Scripts/",
  win: "%APPDATA%\\REAPER\\Scripts\\",
  linux: "~/.config/REAPER/Scripts/",
};

type PingStatus = "idle" | "checking" | "ok" | "fail";

export type ReaperSetupWizardProps = {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialPort: number;
};

export function ReaperSetupWizard({
  open,
  onClose,
  onComplete,
  initialPort,
}: ReaperSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [port, setPort] = useState(initialPort);
  const [pingStatus, setPingStatus] = useState<PingStatus>("idle");

  function handleClose() {
    setStep(1);
    setPingStatus("idle");
    onClose();
  }

  async function testConnection() {
    setPingStatus("checking");
    try {
      const ok = await new ReaperBackend("localhost", port).ping();
      setPingStatus(ok ? "ok" : "fail");
    } catch {
      setPingStatus("fail");
    }
  }

  const os = detectOS();
  const scriptPath = OS_PATHS[os];

  const STEP_TITLES: Record<1 | 2 | 3, string> = {
    1: "Download the bridge script",
    2: "Load the script in Reaper",
    3: "Verify connection",
  };

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-md">
      <div className="space-y-5">
        {/* Step indicator + heading */}
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">
            Step {step} / 3
          </p>
          <h2 className="text-lg font-semibold text-neutral-100">
            {STEP_TITLES[step]}
          </h2>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">
              Download the Lua bridge script and drop it into your Reaper scripts
              folder.
            </p>
            <a
              href="/unbottle-bridge.lua"
              download
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-800 px-4 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-500 hover:bg-neutral-700 hover:text-neutral-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              unbottle-bridge.lua
            </a>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2.5">
              <p className="mb-1 text-xs font-medium text-neutral-500">
                Place it here
              </p>
              <p className="font-mono text-xs text-amber-400">{scriptPath}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Next →</Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <ol className="space-y-2.5">
              {[
                "Open Reaper",
                "Go to Actions → Load ReaScript…",
                "Select unbottle-bridge.lua",
                "Click Run",
              ].map((instruction, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-xs font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <span className="text-neutral-300">{instruction}</span>
                </li>
              ))}
            </ol>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={() => setStep(3)}>Next →</Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-400">
              Make sure Reaper is open and the script is running, then test the
              connection.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="wizard-port"
                  className="text-xs font-medium text-neutral-500"
                >
                  Port
                </label>
                <Input
                  id="wizard-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isInteger(v) && v >= 1 && v <= 65535) {
                      setPort(v);
                      setPingStatus("idle");
                    }
                  }}
                  className="w-28 font-mono"
                />
              </div>
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={testConnection}
                  disabled={pingStatus === "checking"}
                >
                  {pingStatus === "checking" ? "Checking…" : "Test connection"}
                </Button>
              </div>
            </div>

            {pingStatus === "ok" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Connected. You&apos;re ready to use Reaper with Unbottle.
                  </p>
                </div>
              </div>
            )}

            {pingStatus === "fail" && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <p className="text-sm text-red-400">
                  Bridge not found. Make sure Reaper is open and the script is
                  running.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← Back
              </Button>
              {pingStatus === "ok" && (
                <Button onClick={onComplete}>Finish</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
