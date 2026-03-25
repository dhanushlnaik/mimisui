import type { AppCommand } from "../types/command.js";
import { afkCommand } from "./afk.js";
import { avatarSplitCommand } from "./avsplit.js";
import { avatarCommand } from "./avatar.js";
import { bannerCommand } from "./banner.js";
import { configCommand } from "./config.js";
import { dailyCommand } from "./daily.js";
import { demotivationalCommand } from "./demotivational.js";
import { ejectCommand } from "./eject.js";
import { enlargeCommand } from "./enlarge.js";
import { familyCommands } from "./family.js";
import { friendshipAliasCommand } from "./friendship-alias.js";
import { friendshipCommand } from "./friendship.js";
import { funCommands } from "./fun.js";
import { helpCommand } from "./help.js";
import { imageTextCommands } from "./image-text.js";
import { leaderboardCommand } from "./leaderboard.js";
import { multiPfpCommand } from "./multipfp.js";
import { overlayCommands } from "./overlays.js";
import { petPetCommand } from "./petpet.js";
import { pingCommand } from "./ping.js";
import { quoteThisCommand } from "./quote-this.js";
import { prefixCommand } from "./prefix.js";
import { profileCommand } from "./profile.js";
import { quoteImageCommand } from "./quote.js";
import { questsCommand } from "./quests.js";
import {
  relationshipBuyCommand,
  relationshipInventoryCommand,
  relationshipShopCommand,
  relationshipUseCommand
} from "./relationship.js";
import { ripCommand } from "./rip.js";
import { serverAvatarCommand } from "./serverav.js";
import { serverInfoCommand } from "./serverinfo.js";
import { simpCommand } from "./simp.js";
import { shopCommand } from "./shop.js";
import { splitImageCommand } from "./splitimg.js";
import { spotifyNowPlayingCommand } from "./spotifynp.js";
import { thisIsSpotifyCommand } from "./thisisspotify.js";
import { tweetThisCommand } from "./tweet-this.js";
import { triggeredCommand } from "./triggered.js";
import { tweetCommand } from "./tweet.js";
import { uk07Command } from "./uk07.js";
import { userInfoCommand } from "./userinfo.js";
import { usersCommand } from "./users.js";

export const commands: AppCommand[] = [
  pingCommand,
  helpCommand,
  ...familyCommands,
  afkCommand,
  avatarCommand,
  serverAvatarCommand,
  bannerCommand,
  userInfoCommand,
  serverInfoCommand,
  usersCommand,
  profileCommand,
  dailyCommand,
  questsCommand,
  relationshipShopCommand,
  relationshipInventoryCommand,
  relationshipBuyCommand,
  relationshipUseCommand,
  leaderboardCommand,
  shopCommand,
  enlargeCommand,
  splitImageCommand,
  multiPfpCommand,
  ...funCommands,
  prefixCommand,
  configCommand,
  triggeredCommand,
  thisIsSpotifyCommand,
  tweetCommand,
  spotifyNowPlayingCommand,
  quoteImageCommand,
  ejectCommand,
  friendshipCommand,
  friendshipAliasCommand,
  demotivationalCommand,
  ripCommand,
  simpCommand,
  uk07Command,
  petPetCommand,
  avatarSplitCommand,
  ...imageTextCommands,
  ...overlayCommands,
  tweetThisCommand,
  quoteThisCommand
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
