"use client";

import { useEffect, useRef, useState } from "react";
import { AdSlot } from "@/components/ad-slot";
import type { DisplayAdConfig } from "@/lib/display-ads";

type AdSlotStatus = "loading" | "filled" | "no_fill" | "error";

declare global {
  interface Window { adsbygoogle?: unknown[] }
}

const LOAD_TIMEOUT_MS = 8000;
let adsenseScript: Promise<void> | null = null;

function loadAdsense(client: string) {
  adsenseScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.onload = () => resolve();
    script.onerror = () => { adsenseScript = null; reject(new Error("adsense script failed")); };
    document.head.appendChild(script);
  });
  return adsenseScript;
}

/** Fills `mount` and resolves with the outcome. Providers are fixed code paths; config values are env-validated ids. */
async function fill(config: DisplayAdConfig, mount: HTMLDivElement): Promise<AdSlotStatus> {
  if (config.provider === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 300));
    mount.textContent = "Quảng cáo mẫu (mock, chỉ dev/test)";
    return "filled";
  }
  await loadAdsense(config.client);
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.dataset.adClient = config.client;
  ins.dataset.adSlot = config.slot;
  ins.dataset.adFormat = "auto";
  ins.dataset.fullWidthResponsive = "true";
  mount.replaceChildren(ins);
  (window.adsbygoogle ??= []).push({});
  // AdSense reports the outcome through data-ad-status="filled" | "unfilled".
  return new Promise<AdSlotStatus>((resolve) => {
    const done = (status: AdSlotStatus) => { observer.disconnect(); clearTimeout(timer); resolve(status); };
    const check = () => {
      const status = ins.getAttribute("data-ad-status");
      if (status === "filled") done("filled");
      else if (status === "unfilled") done("no_fill");
    };
    const observer = new MutationObserver(check);
    observer.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
    const timer = setTimeout(() => done("no_fill"), LOAD_TIMEOUT_MS);
    check();
  });
}

/**
 * Loads one display placement. Renders nothing when there is no config (disabled/unconfigured) or after
 * no-fill/error, so public pages never show empty frames. Impressions/clicks never grant chapter access.
 */
export function AdSlotContainer({ config }: { config: DisplayAdConfig | null }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<AdSlotStatus>("loading");

  useEffect(() => {
    if (!config || !mountRef.current) return;
    let active = true;
    fill(config, mountRef.current).then((result) => { if (active) setStatus(result); }, () => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [config]);

  if (!config || status === "no_fill" || status === "error") return null;
  return <AdSlot placement={config.placement} status={status === "loading" ? "loading" : "success"}><div ref={mountRef} data-ad-placement={config.placement} data-ad-status={status} /></AdSlot>;
}
