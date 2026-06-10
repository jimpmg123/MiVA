import type { CharacterEmotion } from "../../types";

/**
 * Per-model Live2D expression mapping.
 *
 * Expression names must match the `Name` field registered in each model's
 * `model3.json` FileReferences.Expressions array (pixi-live2d-display applies
 * expressions by registered name). Some bundled models ship without any
 * expressions (shizuku, knight) — those simply fall back to the transform-only
 * idle animation in Live2DStage.
 */
export type Live2DExpressionMap = {
  /** Pleasant everyday expressions cycled at random while the character is idle. */
  casual: string[];
  /** Expression to show for a given emotion. Missing entries fall back gracefully. */
  emotions: Partial<Record<CharacterEmotion, string>>;
};

/**
 * Keyed by character id (see catalog.ts). A character without an entry here is
 * treated as having no expressions (transform-only animation).
 *
 * Mappings were derived by inspecting each model's *.exp3.json parameters:
 *  - mao_pro uses standard Cubism params (ParamMouthAngry, ParamEyeLSmile,
 *    ParamCheek...) so emotions are inferred from those.
 *  - takodachi / doro use opaque custom params, so only semantically named
 *    expressions (Blush, Plead, TongueOut) are mapped; the rest form the
 *    casual pool.
 */
export const expressionMaps: Record<string, Live2DExpressionMap> = {
  "vtuber-mao": {
    // exp_01 wide eyes, exp_02 eye-smile, exp_03 neutral, exp_04 sparkle smile
    casual: ["exp_01", "exp_02", "exp_03", "exp_04"],
    emotions: {
      neutral: "exp_03",
      happy: "exp_04",
      angry: "exp_08", // ParamMouthAngry + AngryLine
      sad: "exp_07", // downturned mouth, worried brows
      surprised: "exp_01", // wide open eyes
      shy: "exp_06", // ParamCheek blush
      playful: "exp_02", // eye-smile
    },
  },
  "vtuber-takodachi": {
    casual: ["expression1", "expression2", "expression3", "Eyes Open"],
    emotions: {
      shy: "Blush",
      sad: "Plead",
      playful: "mug",
      surprised: "Eyes Open",
    },
  },
  "vtuber-pichu": {
    // Pichu ships only strong emotion expressions (no neutral), so idle settles
    // on Happy and the emotions drive the rest.
    casual: ["Happy"],
    emotions: {
      neutral: "Happy",
      happy: "Happy",
      angry: "Angry",
      sad: "Sad",
      surprised: "Shock",
      playful: "Happy",
    },
  },
  "vtuber-doro": {
    // Exp1..Exp8 are meme toggles with opaque params; use them as the casual pool.
    // "Highlight OFF" / "Running OFF" are state toggles and are intentionally excluded.
    casual: ["Exp1", "Exp2", "Exp3", "Exp4", "Exp5"],
    emotions: {
      neutral: "Exp1",
      playful: "TongueOut",
      happy: "Exp2",
      angry: "TongueOut",
      sad: "TongueOut",
      surprised: "Exp4",
      shy: "Exp4",
    },
  },
};

export function getExpressionMap(characterId: string | null | undefined): Live2DExpressionMap | null {
  if (!characterId) {
    return null;
  }
  return expressionMaps[characterId] ?? null;
}
