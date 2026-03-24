import { AttachmentBuilder } from "discord.js";
import { env } from "../env.js";

const WEEBY_API_BASE = "https://weebyapi.xyz";

type GeneratorResult = {
  buffer: Buffer;
  contentType: string | null;
};

function requireWeebyToken() {
  if (!env.WEEBY_API_TOKEN) {
    throw new Error("WEEBY_API_TOKEN is missing in bot environment.");
  }
  return env.WEEBY_API_TOKEN;
}

export async function callWeebyGenerator(
  generator: string,
  params: Record<string, string>
): Promise<GeneratorResult> {
  const token = requireWeebyToken();
  const url = new URL(`/generators/${generator}`, WEEBY_API_BASE);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("token", token);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weeby API failed (${response.status}) for ${generator}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type")
  };
}

export async function callWeebyOverlay(
  type: string,
  params: Record<string, string>
): Promise<GeneratorResult> {
  const token = requireWeebyToken();
  const url = new URL(`/overlays/${type}`, WEEBY_API_BASE);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("token", token);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weeby overlay failed (${response.status}) for ${type}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type")
  };
}

export async function callWeebyCustom(
  custom: string,
  params: Record<string, string>
): Promise<GeneratorResult> {
  const token = requireWeebyToken();
  const url = new URL(`/custom/${custom}`, WEEBY_API_BASE);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  url.searchParams.set("token", token);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weeby custom failed (${response.status}) for ${custom}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type")
  };
}

export function weebyAttachment(
  generator: string,
  result: GeneratorResult,
  forcedExt?: "png" | "gif" | "jpg"
) {
  const ext =
    forcedExt ??
    (result.contentType?.includes("gif")
      ? "gif"
      : result.contentType?.includes("jpeg")
        ? "jpg"
        : "png");

  return new AttachmentBuilder(result.buffer, { name: `${generator}.${ext}` });
}
