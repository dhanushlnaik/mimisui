import { db } from "@cocosui/db";

const rdb = db as any;

export type RelationshipItemCode =
  | "double_date_pass"
  | "bond_bloom"
  | "streak_shield";

type RelationshipItemDef = {
  code: RelationshipItemCode;
  name: string;
  description: string;
  price: number;
};

const ITEM_DEFS: RelationshipItemDef[] = [
  {
    code: "double_date_pass",
    name: "Double Date Pass",
    description: "Doubles the next /date reward (coins + XP + bond gain).",
    price: 420
  },
  {
    code: "bond_bloom",
    name: "Bond Bloom",
    description: "+50% bond XP gains for 1 hour.",
    price: 500
  },
  {
    code: "streak_shield",
    name: "Streak Shield",
    description: "Prevents one missed date streak break.",
    price: 650
  }
];

const ITEM_MAP = new Map<RelationshipItemCode, RelationshipItemDef>(
  ITEM_DEFS.map((i) => [i.code, i])
);

export function getRelationshipItemDefs() {
  return ITEM_DEFS;
}

export function getRelationshipItemDef(code: string) {
  return ITEM_MAP.get(code as RelationshipItemCode) ?? null;
}

export async function getRelationshipInventory(userId: string) {
  const rows = await rdb.relationshipInventory.findMany({
    where: { userId, quantity: { gt: 0 } },
    orderBy: { itemCode: "asc" }
  });
  return rows.map((r: any) => ({
    itemCode: r.itemCode as RelationshipItemCode,
    quantity: r.quantity,
    item: getRelationshipItemDef(r.itemCode)
  }));
}

export async function buyRelationshipItem(input: {
  userId: string;
  guildId: string | null;
  itemCode: RelationshipItemCode;
  quantity: number;
}) {
  const item = getRelationshipItemDef(input.itemCode);
  if (!item) throw new Error("Unknown relationship item.");
  if (!Number.isInteger(input.quantity) || input.quantity <= 0 || input.quantity > 50) {
    throw new Error("Quantity must be between 1 and 50.");
  }

  const totalCost = item.price * input.quantity;
  const progress = await rdb.userProgress.upsert({
    where: { userId: input.userId },
    update: { guildId: input.guildId },
    create: { userId: input.userId, guildId: input.guildId, level: 1, title: "Rookie", xp: 0, coins: 0 }
  });
  if (progress.coins < totalCost) {
    throw new Error(`Not enough coins. Need ${totalCost}, you have ${progress.coins}.`);
  }

  await rdb.userProgress.update({
    where: { userId: input.userId },
    data: { coins: { decrement: totalCost } }
  });
  await rdb.relationshipInventory.upsert({
    where: { userId_itemCode: { userId: input.userId, itemCode: item.code } },
    update: { quantity: { increment: input.quantity } },
    create: { userId: input.userId, itemCode: item.code, quantity: input.quantity }
  });
  await rdb.transaction.create({
    data: {
      userId: input.userId,
      guildId: input.guildId,
      amount: -totalCost,
      reason: `relationship-buy:${item.code}`
    }
  });
  return { item, quantity: input.quantity, totalCost };
}

async function consumeInventory(userId: string, itemCode: RelationshipItemCode) {
  const row = await rdb.relationshipInventory.findUnique({
    where: { userId_itemCode: { userId, itemCode } }
  });
  if (!row || row.quantity <= 0) {
    throw new Error("You don't have that item in your relationship inventory.");
  }
  await rdb.relationshipInventory.update({
    where: { userId_itemCode: { userId, itemCode } },
    data: { quantity: { decrement: 1 } }
  });
}

export async function useRelationshipItem(input: {
  userId: string;
  guildId: string | null;
  itemCode: RelationshipItemCode;
}) {
  const item = getRelationshipItemDef(input.itemCode);
  if (!item) throw new Error("Unknown relationship item.");

  await consumeInventory(input.userId, item.code);
  const now = new Date();

  if (item.code === "double_date_pass") {
    await rdb.booster.create({
      data: {
        userId: input.userId,
        guildId: input.guildId,
        type: "family_double_date_once",
        multiplier: 2,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    return { item, effectText: "Your next date rewards are doubled." };
  }

  if (item.code === "bond_bloom") {
    await rdb.booster.create({
      data: {
        userId: input.userId,
        guildId: input.guildId,
        type: "family_bond_bloom",
        multiplier: 1.5,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
      }
    });
    return { item, effectText: "Bond Bloom activated for 1 hour (+50% bond XP)." };
  }

  if (item.code === "streak_shield") {
    await rdb.booster.create({
      data: {
        userId: input.userId,
        guildId: input.guildId,
        type: "family_streak_shield_once",
        multiplier: 1,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    return { item, effectText: "Streak Shield armed. One missed streak break will be prevented." };
  }

  return { item, effectText: "Item used." };
}

export async function getActiveRelationshipEffects(userId: string) {
  const now = new Date();
  const rows = await rdb.booster.findMany({
    where: {
      userId,
      expiresAt: { gt: now },
      type: { in: ["family_double_date_once", "family_bond_bloom", "family_streak_shield_once"] }
    },
    orderBy: { expiresAt: "asc" }
  });

  return rows.map((b: any) => {
    const until = `<t:${Math.floor(new Date(b.expiresAt).getTime() / 1000)}:R>`;
    if (b.type === "family_double_date_once") {
      return `🎟 Double Date Pass (next /date) • expires ${until}`;
    }
    if (b.type === "family_bond_bloom") {
      return `🌸 Bond Bloom x${b.multiplier} • expires ${until}`;
    }
    if (b.type === "family_streak_shield_once") {
      return `🛡 Streak Shield (one save) • expires ${until}`;
    }
    return `🧪 ${b.type} x${b.multiplier} • expires ${until}`;
  });
}
