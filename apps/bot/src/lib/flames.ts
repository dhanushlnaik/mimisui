export type FlamesCancelStep = {
  matched: string;
  name1After: string[];
  name2After: string[];
};

export type FlamesEliminationStep = {
  before: string[];
  removed: string;
  after: string[];
};

export type FlamesProcess = {
  normalized1: string;
  normalized2: string;
  cancelSteps: FlamesCancelStep[];
  remaining1: string;
  remaining2: string;
  count: number;
  flamesSteps: FlamesEliminationStep[];
  finalLetter: string;
  finalResult: string;
};

const RESULT_MAP: Record<string, string> = {
  F: "Friends",
  L: "Love",
  A: "Affection",
  M: "Marriage",
  E: "Enemies",
  S: "Siblings"
};

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeFlamesName(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function formatCancelledArray(arr: string[]) {
  return arr.map((x) => (x === "❌" ? "~~❌~~" : x)).join(" ");
}

export function formatFlamesStep(before: string[], removed: string) {
  return before.map((letter) => (letter === removed ? `~~${letter}~~` : letter)).join(" ");
}

export function getFlamesProcess(name1: string, name2: string): FlamesProcess {
  const normalized1 = normalizeFlamesName(name1);
  const normalized2 = normalizeFlamesName(name2);

  const arr1 = normalized1.split("");
  const arr2 = normalized2.split("");
  const display1 = [...arr1];
  const display2 = [...arr2];
  const cancelSteps: FlamesCancelStep[] = [];

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] == null) continue;
    const matchIndex = arr2.indexOf(arr1[i]!);
    if (matchIndex === -1) continue;

    display1[i] = "❌";
    display2[matchIndex] = "❌";
    arr1[i] = "";
    arr2[matchIndex] = "";

    cancelSteps.push({
      matched: normalized1[i] ?? "",
      name1After: [...display1],
      name2After: [...display2]
    });
  }

  const remaining1 = arr1.filter(Boolean).join("");
  const remaining2 = arr2.filter(Boolean).join("");
  const count = Math.max(1, remaining1.length + remaining2.length);

  const flames = ["F", "L", "A", "M", "E", "S"];
  let index = 0;
  const flamesSteps: FlamesEliminationStep[] = [];

  while (flames.length > 1) {
    index = (index + count - 1) % flames.length;
    const removed = flames[index] ?? "F";
    const before = [...flames];
    flames.splice(index, 1);
    flamesSteps.push({ before, removed, after: [...flames] });
  }

  const finalLetter = flames[0] ?? "F";

  return {
    normalized1,
    normalized2,
    cancelSteps,
    remaining1,
    remaining2,
    count,
    flamesSteps,
    finalLetter,
    finalResult: RESULT_MAP[finalLetter] ?? "Friends"
  };
}

