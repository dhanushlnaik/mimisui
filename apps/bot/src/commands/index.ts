import type { SlashCommand } from "../types/command";
import { afkCommand } from "./afk";
import { configCommand } from "./config";
import { pingCommand } from "./ping";
import { prefixCommand } from "./prefix";

export const commands: SlashCommand[] = [pingCommand, afkCommand, prefixCommand, configCommand];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
