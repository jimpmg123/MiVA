import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PromptSettings } from "../../types";
import {
  getLive2DRuntimeStatus,
  resolveInstalledLive2DCoreUrl,
  resolveInstalledLive2DModelUrl,
  type Live2DRuntimeStatus,
} from "./live2dRuntime";

type Live2DStageProps = {
  character: PromptSettings["character"];
  activity: "Idle" | "Thinking" | "Speaking";
  fallback?: ReactNode;
  bottomReservePx?: number;
  topReservePx?: number;
};

type StageState = "loading" | "ready" | "missing" | "error";
type Live2DDisplayModel = {
  destroy: () => void;
  height: number;
  scale: { set: (scale: number) => void };
  width: number;
  x: number;
  y: number;
  rotation: number;
};

let cubismCoreScriptPromise: Promise<void> | null = null;

function loadScriptOnce(src: string) {
  if (cubismCoreScriptPromise) {
    return cubismCoreScriptPromise;
  }

  cubismCoreScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-miva-live2d-core="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.mivaLive2dCore = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cubism Core script failed to load."));
    document.head.appendChild(script);
  });

  return cubismCoreScriptPromise;
}

export function Live2DStage({
  activity,
  character,
  fallback,
  bottomReservePx = 220,
  topReservePx = 56,
}: Live2DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<Live2DDisplayModel | null>(null);
  const basePoseRef = useRef({ x: 0, y: 0, scale: 1 });
  const activityRef = useRef(activity);
  const [runtimeStatus, setRuntimeStatus] = useState<Live2DRuntimeStatus | null>(null);
  const [stageState, setStageState] = useState<StageState>("loading");
  const [stageMessage, setStageMessage] = useState("Preparing Live2D runtime...");

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    let cancelled = false;
    setStageState("loading");
    setStageMessage("Checking Live2D runtime installation...");

    void getLive2DRuntimeStatus()
      .then((status) => {
        if (cancelled) {
          return;
        }
        setRuntimeStatus(status);
        if (!status.ready) {
          setStageState("missing");
          setStageMessage("Install Live2D runtime in Studio > 2D Character.");
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setStageState("error");
        setStageMessage(String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const coreUrl = useMemo(() => resolveInstalledLive2DCoreUrl(runtimeStatus), [runtimeStatus]);
  const modelUrl = useMemo(
    () => resolveInstalledLive2DModelUrl(runtimeStatus, character.live2dModelPath),
    [runtimeStatus, character.live2dModelPath],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !runtimeStatus?.ready || !coreUrl || !modelUrl) {
      return;
    }

    let destroyed = false;
    let cleanup: (() => void) | null = null;
    const resolvedCoreUrl = coreUrl;
    const resolvedModelUrl = modelUrl;

    async function mountLive2D() {
      try {
        setStageState("loading");
        setStageMessage("Loading Live2D model...");
        await loadScriptOnce(resolvedCoreUrl);

        const PIXI = await import("pixi.js");
        (window as unknown as { PIXI?: typeof PIXI }).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        if (destroyed || !containerRef.current) {
          return;
        }

        const app = new PIXI.Application({
          autoDensity: true,
          backgroundAlpha: 0,
          height: Math.max(240, containerRef.current.clientHeight),
          resolution: window.devicePixelRatio || 1,
          width: Math.max(240, containerRef.current.clientWidth),
        });
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(app.view as HTMLCanvasElement);

        const model = await Live2DModel.from(resolvedModelUrl, { autoInteract: false });
        if (destroyed) {
          model.destroy();
          app.destroy(true);
          return;
        }

        app.stage.addChild(model);
        modelRef.current = model;
        const naturalWidth = Math.max(1, model.width);
        const naturalHeight = Math.max(1, model.height);

        const fitModel = () => {
          if (!containerRef.current) {
            return;
          }
          const width = Math.max(240, containerRef.current.clientWidth);
          const height = Math.max(240, containerRef.current.clientHeight);
          app.renderer.resize(width, height);
          const topReserve = Math.min(Math.max(0, topReservePx), Math.max(0, height * 0.18));
          const bottomReserve = Math.min(Math.max(0, bottomReservePx), Math.max(96, height * 0.34));
          const availableHeight = Math.max(220, height - topReserve - bottomReserve);
          const scale = Math.min(width / naturalWidth, availableHeight / naturalHeight) * 0.96;
          const fittedWidth = naturalWidth * scale;
          const fittedHeight = naturalHeight * scale;
          model.scale.set(scale);
          model.x = width / 2 - fittedWidth / 2;
          model.y = topReserve + Math.max(0, availableHeight - fittedHeight);
          model.rotation = 0;
          basePoseRef.current = { x: model.x, y: model.y, scale };
        };

        fitModel();
        const resizeObserver = new ResizeObserver(fitModel);
        resizeObserver.observe(containerRef.current);
        setStageState("ready");
        setStageMessage("Live2D ready");

        let animationFrame = 0;
        const startedAt = performance.now();
        const animateReaction = (now: number) => {
          if (destroyed) {
            return;
          }

          const liveModel = modelRef.current;
          if (liveModel) {
            const elapsed = (now - startedAt) / 1000;
            const currentActivity = activityRef.current;
            const pose = basePoseRef.current;
            const speaking = currentActivity === "Speaking";
            const thinking = currentActivity === "Thinking";
            const lift = speaking ? Math.sin(elapsed * 8.5) * 4 : thinking ? Math.sin(elapsed * 3.2) * 2 : Math.sin(elapsed * 1.3) * 1.4;
            const sway = speaking ? Math.sin(elapsed * 4.8) * 4 : thinking ? Math.sin(elapsed * 2.1) * 2.2 : Math.sin(elapsed * 0.9) * 1.2;
            const tilt = speaking ? Math.sin(elapsed * 5.8) * 0.018 : thinking ? Math.sin(elapsed * 1.8) * 0.012 : Math.sin(elapsed * 0.8) * 0.006;
            const pulse = speaking ? 1 + Math.sin(elapsed * 7.2) * 0.006 : thinking ? 1 + Math.sin(elapsed * 2.4) * 0.003 : 1;

            liveModel.scale.set(pose.scale * pulse);
            liveModel.x = pose.x + sway;
            liveModel.y = pose.y - lift;
            liveModel.rotation = tilt;
          }

          animationFrame = requestAnimationFrame(animateReaction);
        };
        animationFrame = requestAnimationFrame(animateReaction);

        cleanup = () => {
          cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          modelRef.current = null;
          model.destroy();
          app.destroy(true, true);
        };
      } catch (error) {
        if (!destroyed) {
          setStageState("error");
          setStageMessage(String(error));
        }
      }
    }

    void mountLive2D();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, [coreUrl, modelUrl, runtimeStatus?.ready]);

  return (
    <div className="relative h-full min-h-[430px] w-full overflow-visible bg-transparent">
      <div ref={containerRef} className="absolute inset-0" />
      {stageState !== "ready" && (
        <div className="absolute inset-0 grid place-items-center p-5 text-center">
          {stageState === "missing" || stageState === "error" ? (
            fallback ?? (
              <div className="grid gap-2 text-sm text-[var(--miva-text-muted)]">
                <span className="material-symbols-outlined text-[32px] text-[var(--miva-text-soft)]">deployed_code_alert</span>
                <span>{stageMessage}</span>
              </div>
            )
          ) : (
            <div className="grid gap-2 text-sm font-semibold text-[var(--miva-primary)]">
              <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
              <span>{stageMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
