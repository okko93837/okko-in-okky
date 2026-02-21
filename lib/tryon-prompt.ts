export type TuckStyle = 'in' | 'out';
export type SleeveStyle = 'rollup' | 'rolldown';

export interface StyleOptions {
  tuck?: TuckStyle;
  sleeve?: SleeveStyle;
}

const BASE_PROMPT = `
You are performing a virtual try-on task. You are given 4 reference images in this exact order:
  Image 1: The person (model) — keep this person's body, pose, and background exactly as-is.
  Image 2: The TOP garment — replace whatever the model is wearing on top with this exact garment.
  Image 3: The BOTTOM garment — replace whatever the model is wearing on the bottom with this exact garment.
  Image 4: The SHOES — REMOVE the model's current shoes entirely and replace them with ONLY the shoes shown in Image 4. The shoes on the model's feet in the final image must look identical to Image 4.

STRICT RULES — do NOT violate any of these:
- Do NOT keep or reuse any clothing from the model's original outfit (Image 1). All garments must come from Images 2, 3, 4.
- Do NOT change the color, brightness, saturation, pattern, logo, texture, or silhouette of any garment from Images 2, 3, 4.
- Do NOT invent or hallucinate any detail not present in the garment images.
- Do NOT blend, stylize, or reinterpret the garments — copy them exactly as they appear in the reference images.
- SHOES: the footwear in the final image must exactly match Image 4 in color, shape, and style — not Image 1.
- Keep the model's body proportions, face, hair, pose, and white studio background identical to Image 1.
- The final image must show the full body from head to toe including feet, with no cropping.
- Portrait orientation, white background, studio lighting, centered composition. No text, no watermark.
`.trim();

const STYLE_RULES: Record<string, string[]> = {
  tuckIn: [
    'STYLE RULE: The top garment must be fully tucked into the bottom garment.',
    'RE-CHECK BEFORE GENERATING: Is the top garment fully tucked into the bottom? If not, correct it.',
  ],
  tuckOut: [
    'STYLE RULE: The top garment must be completely UNTUCKED — the hem must hang freely outside and over the waistband. Do NOT tuck the top in, even if Image 1 shows it tucked.',
    'RE-CHECK BEFORE GENERATING: Is the top garment hanging outside the waistband, fully untucked? If it is tucked in, correct it now.',
  ],
  sleeveRollUp: [
    'STYLE RULE: The sleeves of the top garment must be rolled up to the elbow.',
    'RE-CHECK BEFORE GENERATING: Are the sleeves rolled up to the elbow? If not, correct it.',
  ],
  sleeveRollDown: [
    'STYLE RULE: The sleeves of the top garment must remain fully unrolled at full length.',
    'RE-CHECK BEFORE GENERATING: Are the sleeves fully unrolled? If not, correct it.',
  ],
};

export function buildTryonPrompt(styleOptions?: StyleOptions): string {
  const parts = [BASE_PROMPT];

  if (styleOptions?.tuck === 'in') {
    parts.push(STYLE_RULES.tuckIn.join('\n'));
  } else if (styleOptions?.tuck === 'out') {
    parts.push(STYLE_RULES.tuckOut.join('\n'));
  }

  if (styleOptions?.sleeve === 'rollup') {
    parts.push(STYLE_RULES.sleeveRollUp.join('\n'));
  } else if (styleOptions?.sleeve === 'rolldown') {
    parts.push(STYLE_RULES.sleeveRollDown.join('\n'));
  }

  return parts.join('\n\n');
}
