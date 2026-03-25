import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types/command.js";
import {
  buyRelationshipItem,
  getRelationshipInventory,
  getRelationshipItemDefs,
  useRelationshipItem,
  type RelationshipItemCode
} from "../lib/relationship-items.js";

const ITEM_CHOICES = [
  { name: "Double Date Pass", value: "double_date_pass" },
  { name: "Bond Bloom", value: "bond_bloom" },
  { name: "Streak Shield", value: "streak_shield" }
] as const;

export const relationshipShopCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("relationshipshop")
    .setDescription("View relationship item shop."),
  async execute(interaction) {
    const items = getRelationshipItemDefs();
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setTitle("Relationship Shop")
          .setDescription(
            items
              .map((i) => `**${i.name}** (\`${i.code}\`)\n${i.description}\nPrice: \`${i.price} coins\``)
              .join("\n\n")
          )
          .setFooter({ text: "Use /relationshipbuy to purchase items." })
      ]
    });
  }
};

export const relationshipInventoryCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("relationshipinventory")
    .setDescription("View your relationship inventory."),
  async execute(interaction) {
    const inv = await getRelationshipInventory(interaction.user.id);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf72585)
          .setTitle("Relationship Inventory")
          .setDescription(
            inv.length > 0
              ? inv.map((i: any) => `• **${i.item?.name ?? i.itemCode}** x${i.quantity} (\`${i.itemCode}\`)`).join("\n")
              : "No relationship items in inventory."
          )
          .setFooter({ text: "Use /relationshipuse to activate an item." })
      ]
    });
  }
};

export const relationshipBuyCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("relationshipbuy")
    .setDescription("Buy an item from relationship shop.")
    .addStringOption((o) =>
      o
        .setName("item")
        .setDescription("Item code")
        .setRequired(true)
        .addChoices(...ITEM_CHOICES)
    )
    .addIntegerOption((o) => o.setName("quantity").setDescription("Quantity").setMinValue(1).setMaxValue(50)),
  async execute(interaction) {
    const itemCode = interaction.options.getString("item", true) as RelationshipItemCode;
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const result = await buyRelationshipItem({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      itemCode,
      quantity
    });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("Purchase Successful")
          .setDescription(
            [
              `Bought: **${result.item.name}** x${result.quantity}`,
              `Cost: \`${result.totalCost} coins\``
            ].join("\n")
          )
      ]
    });
  }
};

export const relationshipUseCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("relationshipuse")
    .setDescription("Use a relationship item.")
    .addStringOption((o) =>
      o
        .setName("item")
        .setDescription("Item code")
        .setRequired(true)
        .addChoices(...ITEM_CHOICES)
    ),
  async execute(interaction) {
    const itemCode = interaction.options.getString("item", true) as RelationshipItemCode;
    const result = await useRelationshipItem({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      itemCode
    });
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x15ff00)
          .setTitle("Item Activated")
          .setDescription(`**${result.item.name}** used.\n${result.effectText}`)
      ]
    });
  }
};
