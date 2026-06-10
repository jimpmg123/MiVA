import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CharacterEmotion, PromptSettings } from "../../types";
import {
  getLive2DRuntimeStatus,
  resolveInstalledLive2DCoreUrl,
  resolveInstalledLive2DModelUrl,
  type Live2DRuntimeStatus,
} from "./live2dRuntime";
import { getExpressionMap } from "./expressionCatalog";

type Live2DStageProps = {
  character: PromptSettings["character"];
  activity: "Idle" | "Thinking" | "Speaking";
  emotion?: CharacterEmotion;
  expressionTrigger?: number;
  poseTrigger?: number;
  fallback?: ReactNode;
  bottomReservePx?: number;
  topReservePx?: number;
  blockPointerEvents?: boolean;
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
  expression?: (id?: string | number) => Promise<boolean> | boolean;
  internalModel?: { settings?: unknown };
};

type Live2DExpressionSettings = { expressions?: Array<{ Name?: string }> };

/** How long an emotion expression is held before idle cycling resumes. */
const EMOTION_HOLD_MS = 6000;
/** How long a direct "change pose" command holds a pose transform. */
const POSE_HOLD_MS = 6000;
/** Random idle expression cadence bounds. */
const CASUAL_MIN_MS = 6000;
const CASUAL_MAX_MS = 14000;

function nextCasualDelay() {
  return CASUAL_MIN_MS + Math.random() * (CASUAL_MAX_MS - CASUAL_MIN_MS);
}

let cubismCoreScriptPromise: Promise<void> | null = null;

function isCubismCoreReady() {
  return Boolean((window as typeof window & { Live2DCubismCore?: unknown }).Live2DCubismCore);
}

function waitForCubismCore(timeoutMs = 5000) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = performance.now();
    const check = () => {
      if (isCubismCoreReady()) {
        resolve();
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        reject(new Error("Cubism Core script loaded, but the runtime did not initialize."));
        return;
      }
      window.setTimeout(check, 25);
    };
    check();
  });
}

function loadScriptOnce(src: string) {
  if (isCubismCoreReady()) {
    return Promise.resolve();
  }
  if (cubismCoreScriptPromise) {
    return cubismCoreScriptPromise;
  }

  cubismCoreScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-miva-live2d-core]");
    existing?.remove();

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.mivaLive2dCore = src;
    script.onload = () => {
      void waitForCubismCore().then(resolve, reject);
    };
    script.onerror = () => reject(new Error("Cubism Core script failed to load."));
    document.head.appendChild(script);
  }).catch((error) => {
    cubismCoreScriptPromise = null;
    throw error;
  });

  return cubismCoreScriptPromise;
}

export function Live2DStage({
  activity,
  emotion = "neutral",
  expressionTrigger = 0,
  poseTrigger = 0,
  blockPointerEvents = false,
  character,
  fallback,
  bottomReservePx = 220,
  topReservePx = 56,
}: Live2DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<Live2DDisplayModel | null>(null);
  const basePoseRef = useRef({ x: 0, y: 0, scale: 1 });
  const activityRef = useRef(activity);
  const emotionRef = useRef(emotion);
  const expressionTriggerRef = useRef(expressionTrigger);
  const poseTriggerRef = useRef(poseTrigger);
  const poseVariantRef = useRef(0);
  const poseHoldUntilRef = useRef(0);
  const applyEmotionRef = useRef<((emotion: CharacterEmotion) => void) | null>(null);
  const applyExpressionTriggerRef = useRef<(() => void) | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<Live2DRuntimeStatus | null>(null);
  const [stageState, setStageState] = useState<StageState>("loading");
  const [stageMessage, setStageMessage] = useState("Preparing Live2D runtime...");

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    emotionRef.current = emotion;
    if (emotion && emotion !== "neutral") {
      applyEmotionRef.current?.(emotion);
    }
  }, [emotion]);

  useEffect(() => {
    if (expressionTrigger === expressionTriggerRef.current) {
      return;
    }
    expressionTriggerRef.current = expressionTrigger;
    applyExpressionTriggerRef.current?.();
  }, [expressionTrigger]);

  useEffect(() => {
    if (poseTrigger === poseTriggerRef.current) {
      return;
    }
    poseTriggerRef.current = poseTrigger;
    poseVariantRef.current = (poseVariantRef.current % 3) + 1;
    poseHoldUntilRef.current = performance.now() + POSE_HOLD_MS;
  }, [poseTrigger]);

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
        const canvas = app.view as HTMLCanvasElement;
        if (blockPointerEvents) {
          canvas.style.pointerEvents = "none";
        }
        containerRef.current.appendChild(canvas);

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

        // --- Expression engine -------------------------------------------
        const expressionMap = getExpressionMap(character.characterId);
        const expressionSettings = model.internalModel?.settings as Live2DExpressionSettings | undefined;
        const availableExpressions = new Set<string>(
          (expressionSettings?.expressions ?? [])
            .map((entry) => entry.Name)
            .filter((name): name is string => Boolean(name)),
        );
        const hasExpressions = Boolean(expressionMap) && availableExpressions.size > 0;
        const casualPool = (expressionMap?.casual ?? []).filter((name) => availableExpressions.has(name));
        const expressionPool = Array.from(new Set([
          ...casualPool,
          ...Object.values(expressionMap?.emotions ?? {}).filter((name): name is string => Boolean(name)),
        ])).filter((name) => availableExpressions.has(name));
        let lastDirectExpressionName: string | null = null;

        const applyExpression = (name: string | undefined) => {
          if (name && availableExpressions.has(name)) {
            void modelRef.current?.expression?.(name);
          }
        };

        const pickDirectExpression = () => {
          if (!expressionPool.length) {
            return null;
          }
          const candidates = expressionPool.filter((name) => name !== lastDirectExpressionName);
          return candidates[Math.floor(Math.random() * candidates.length)] ?? expressionPool[0] ?? null;
        };

        let emotionHoldUntil = 0;
        let nextCasualAt = performance.now() + nextCasualDelay();

        applyExpressionTriggerRef.current = () => {
          if (!hasExpressions) {
            return;
          }
          const name = pickDirectExpression();
          if (!name) {
            return;
          }
          applyExpression(name);
          lastDirectExpressionName = name;
          emotionHoldUntil = performance.now() + EMOTION_HOLD_MS;
          nextCasualAt = performance.now() + nextCasualDelay();
        };

        applyEmotionRef.current = (nextEmotion) => {
          if (!hasExpressions || !expressionMap) {
            return;
          }
          const name = expressionMap.emotions[nextEmotion];
          if (name && availableExpressions.has(name)) {
            applyExpression(name);
            emotionHoldUntil = performance.now() + EMOTION_HOLD_MS;
          }
        };

        // Apply an emotion that arrived before the model finished loading.
        if (emotionRef.current && emotionRef.current !== "neutral") {
          applyEmotionRef.current(emotionRef.current);
        }
        if (expressionTriggerRef.current > 0) {
          applyExpressionTriggerRef.current();
        }
        if (poseTriggerRef.current > 0) {
          poseVariantRef.current = ((poseTriggerRef.current - 1) % 3) + 1;
          poseHoldUntilRef.current = performance.now() + POSE_HOLD_MS;
        }

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
            const poseVariant = now < poseHoldUntilRef.current ? poseVariantRef.current : 0;
            const lift = speaking ? Math.sin(elapsed * 8.5) * 4 : thinking ? Math.sin(elapsed * 3.2) * 2 : Math.sin(elapsed * 1.3) * 1.4;
            const sway = speaking ? Math.sin(elapsed * 4.8) * 4 : thinking ? Math.sin(elapsed * 2.1) * 2.2 : Math.sin(elapsed * 0.9) * 1.2;
            const tilt = speaking ? Math.sin(elapsed * 5.8) * 0.018 : thinking ? Math.sin(elapsed * 1.8) * 0.012 : Math.sin(elapsed * 0.8) * 0.006;
            const pulse = speaking ? 1 + Math.sin(elapsed * 7.2) * 0.006 : thinking ? 1 + Math.sin(elapsed * 2.4) * 0.003 : 1;
            const poseX = poseVariant === 1 ? -18 : poseVariant === 2 ? 18 : 0;
            const poseY = poseVariant === 3 ? -12 : 0;
            const poseTilt = poseVariant === 1 ? -0.045 : poseVariant === 2 ? 0.045 : poseVariant === 3 ? Math.sin(elapsed * 4.2) * 0.025 : 0;
            const poseScale = poseVariant === 3 ? 1.018 : 1;

            liveModel.scale.set(pose.scale * pulse * poseScale);
            liveModel.x = pose.x + sway + poseX;
            liveModel.y = pose.y - lift + poseY;
            liveModel.rotation = tilt + poseTilt;

            // Cycle a random everyday expression while idle and not holding an emotion.
            if (
              hasExpressions
              && casualPool.length > 0
              && currentActivity === "Idle"
              && now >= emotionHoldUntil
              && now >= nextCasualAt
            ) {
              applyExpression(casualPool[Math.floor(Math.random() * casualPool.length)]);
              nextCasualAt = now + nextCasualDelay();
            }
          }

          animationFrame = requestAnimationFrame(animateReaction);
        };
        animationFrame = requestAnimationFrame(animateReaction);

        cleanup = () => {
          cancelAnimationFrame(animationFrame);
          resizeObserver.disconnect();
          applyEmotionRef.current = null;
          applyExpressionTriggerRef.current = null;
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
  }, [blockPointerEvents, coreUrl, modelUrl, runtimeStatus?.ready]);

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
