export type HelpCategory =
  | "overview"
  | "utility"
  | "fun"
  | "social"
  | "configuration"
  | "image";

export type CommandDoc = {
  name: string;
  description: string;
  category: Exclude<HelpCategory, "overview">;
  slash: string;
  prefix?: string;
  aliases?: string[];
  examples?: string[];
};

export const commandCatalog: CommandDoc[] = [
  { name: "ping", description: "Check bot latency", category: "utility", slash: "/ping", prefix: "ping", aliases: ["p", "status"] },
  { name: "botstats", description: "Runtime metrics snapshot for admins", category: "utility", slash: "/botstats", prefix: "-", aliases: ["metrics", "health"] },
  { name: "reloadcommands", description: "Re-register slash commands (guild/global)", category: "configuration", slash: "/reloadcommands <scope> [guild_id]", prefix: "-", aliases: ["reload"] },
  { name: "avatar", description: "Show single avatar or shared avatars", category: "utility", slash: "/avatar [user] [user2]", prefix: "avatar [@user1] [@user2]", aliases: ["av", "pfp"] },
  { name: "serverav", description: "Show server-specific avatar", category: "utility", slash: "/serverav [user]", prefix: "serverav [@user]", aliases: ["sav"] },
  { name: "banner", description: "Show user banner", category: "utility", slash: "/banner [user]", prefix: "banner [@user]", aliases: ["bnr"] },
  { name: "userinfo", description: "Show user info with roles", category: "utility", slash: "/userinfo [user]", prefix: "userinfo [@user]", aliases: ["whois", "ui"] },
  { name: "serverinfo", description: "Show server info", category: "utility", slash: "/serverinfo", prefix: "serverinfo", aliases: ["sinfo"] },
  { name: "users", description: "Show total server members", category: "utility", slash: "/users", prefix: "users", aliases: ["members"] },
  { name: "enlarge", description: "Enlarge a custom emoji", category: "utility", slash: "/enlarge <emoji>", prefix: "enlarge <emoji>", aliases: ["jumbo"] },
  { name: "splitimg", description: "Split image into left/right halves", category: "image", slash: "/splitimg <image>", prefix: "splitimg (with image attachment)", aliases: ["splitimage"] },
  { name: "multipfp", description: "Merge multiple user avatars", category: "image", slash: "/multipfp [user1..user6]", prefix: "multipfp @u1 @u2 ...", aliases: ["mergepfp", "mpfp"] },
  { name: "afk", description: "Set your AFK status and reason", category: "social", slash: "/afk [reason]", prefix: "afk [reason]", aliases: ["away"] },
  { name: "prefix", description: "Get/set server prefix", category: "configuration", slash: "/prefix get | /prefix set <value>", prefix: "prefix get | prefix set <value>", aliases: ["pre"] },
  { name: "config", description: "Toggle modules for a guild", category: "configuration", slash: "/config <module> <enabled>", prefix: "config <module> <on|off>", aliases: ["cfg", "settings"] },
  { name: "help", description: "Interactive command guide with categories", category: "utility", slash: "/help [command]", prefix: "help [category|command]", aliases: ["h", "commands"] },
  { name: "family", description: "Family hub (prefix namespace alias)", category: "social", slash: "-", prefix: "family <command>", aliases: ["fam"] },
  { name: "marry", description: "Marry another user !", category: "social", slash: "/marry <user>", prefix: "marry @user | family marry @user", aliases: ["propose"] },
  { name: "divorce", description: "Take a Divorce!", category: "social", slash: "/divorce", prefix: "divorce | family divorce", aliases: ["breakup"] },
  { name: "partner", description: "Check your Marital Status.", category: "social", slash: "/partner", prefix: "partner | family partner", aliases: ["spouse"] },
  { name: "date", description: "Claim UwU Points by Dating.", category: "social", slash: "/date", prefix: "date | family date", aliases: ["goout"] },
  { name: "familysim", description: "Run relationship simulation outcomes.", category: "social", slash: "/familysim", prefix: "familysim | family familysim | family sim", aliases: ["familysimulation", "sim"] },
  { name: "familysimstats", description: "View simulation history analytics.", category: "social", slash: "/familysimstats", prefix: "familysimstats | family familysimstats | family simstats", aliases: ["simstats", "simlog"] },
  { name: "familysimmilestones", description: "View simulation milestone board.", category: "social", slash: "/familysimmilestones", prefix: "familysimmilestones | family familysimmilestones | family simmilestones", aliases: ["simmilestones", "simmile"] },
  { name: "familysimladder", description: "View weekly simulation ladder.", category: "social", slash: "/familysimladder", prefix: "familysimladder | family familysimladder | family simladder", aliases: ["simladder"] },
  { name: "familysimduel", description: "Duel another active couple.", category: "social", slash: "/familysimduel <user>", prefix: "familysimduel @user | family familysimduel @user", aliases: ["simduel", "duel"] },
  { name: "familysimduelhistory", description: "View your recent duel history.", category: "social", slash: "/familysimduelhistory", prefix: "familysimduelhistory | family familysimduelhistory", aliases: ["simduelhistory", "duelhistory"] },
  { name: "familysimseason", description: "View current simulation season.", category: "social", slash: "/familysimseason", prefix: "familysimseason | family familysimseason", aliases: ["simseason", "season"] },
  { name: "familysimseasonclaim", description: "Claim previous season rewards.", category: "social", slash: "/familysimseasonclaim", prefix: "familysimseasonclaim | family familysimseasonclaim", aliases: ["simseasonclaim", "seasonclaim"] },
  { name: "familysimseasonstart", description: "Admin: force start/reset simulation season.", category: "social", slash: "/familysimseasonstart [season_key]", prefix: "familysimseasonstart [season_key] | family familysimseasonstart [season_key]", aliases: ["simseasonstart"] },
  { name: "familysimseasonend", description: "Admin: force end simulation season.", category: "social", slash: "/familysimseasonend [season_key]", prefix: "familysimseasonend [season_key] | family familysimseasonend [season_key]", aliases: ["simseasonend"] },
  { name: "familysimladderreset", description: "Admin: reset seasonal simulation ladder.", category: "social", slash: "/familysimladderreset [season_key]", prefix: "familysimladderreset [season_key] | family familysimladderreset [season_key]", aliases: ["simladderreset"] },
  { name: "familysimladderrecompute", description: "Admin: recompute ladder tiers from points.", category: "social", slash: "/familysimladderrecompute [season_key]", prefix: "familysimladderrecompute [season_key] | family familysimladderrecompute [season_key]", aliases: ["simladderrecompute"] },
  { name: "familysimaudit", description: "Admin: anti-abuse logs and active penalties.", category: "social", slash: "/familysimaudit [limit]", prefix: "familysimaudit | family familysimaudit", aliases: ["simaudit"] },
  { name: "familysimpenaltyclear", description: "Admin: clear active anti-abuse penalty flags.", category: "social", slash: "/familysimpenaltyclear [flag_id] [user] [relationship_id] [all]", prefix: "familysimpenaltyclear [all|flag <id>|@user|rel <relationshipId>] | family familysimpenaltyclear ...", aliases: ["simpenaltyclear"] },
  { name: "familysimadminpanel", description: "Admin: interactive sim operations panel.", category: "social", slash: "/familysimadminpanel", prefix: "familysimadminpanel | family familysimadminpanel", aliases: ["simadminpanel"] },
  { name: "familysimpanel", description: "Open interactive simulation panel.", category: "social", slash: "/familysimpanel", prefix: "familysimpanel | family familysimpanel | family simpanel", aliases: ["simpanel"] },
  { name: "anniversary", description: "View anniversary and days together", category: "social", slash: "/anniversary", prefix: "anniversary | family anniversary", aliases: ["anni"] },
  { name: "anniversaryclaim", description: "Claim monthly anniversary rewards.", category: "social", slash: "/anniversaryclaim", prefix: "anniversaryclaim | family anniversaryclaim", aliases: ["anniclaim"] },
  { name: "familyevent", description: "View this week's family event bonus.", category: "social", slash: "/familyevent", prefix: "familyevent | family familyevent", aliases: ["fevent"] },
  { name: "familyprofile", description: "Check your Family.", category: "social", slash: "/familyprofile [user]", prefix: "familyprofile [@user] | family profile [@user]", aliases: ["fprofile"] },
  { name: "siblings", description: "Check Your Siblings.", category: "social", slash: "/siblings", prefix: "siblings | family siblings", aliases: ["sibs"] },
  { name: "siblingadd", description: "Make someone your Sibling", category: "social", slash: "/siblingadd <user>", prefix: "siblingadd @user | family siblingadd @user", aliases: ["sibadd"] },
  { name: "siblingremove", description: "Disown Your Sister.", category: "social", slash: "/siblingremove <user>", prefix: "siblingremove @user | family siblingremove @user", aliases: ["sibremove"] },
  { name: "coupleleaderboard", description: "Shows Leadeboard for UwU points.", category: "social", slash: "/coupleleaderboard", prefix: "coupleleaderboard | family coupleleaderboard", aliases: ["clb"] },
  { name: "familyleaderboard", description: "Shows Leadeboard for UwU points.", category: "social", slash: "/familyleaderboard", prefix: "familyleaderboard | family leaderboard", aliases: ["flb"] },
  { name: "bondstatus", description: "Check bond stats with someone.", category: "social", slash: "/bondstatus <user>", prefix: "bondstatus @user | family bondstatus @user", aliases: ["bond"] },
  { name: "familyquests", description: "View family relationship quests.", category: "social", slash: "/familyquests", prefix: "familyquests | family familyquests", aliases: ["fquests"] },
  { name: "familyachievements", description: "View permanent family achievements.", category: "social", slash: "/familyachievements", prefix: "familyachievements | family familyachievements", aliases: ["fach"] },
  { name: "familyachieveclaim", description: "Claim completed family achievements.", category: "social", slash: "/familyachieveclaim [key]", prefix: "familyachieveclaim [key] | family familyachieveclaim [key]", aliases: ["fachclaim"] },
  { name: "profile", description: "View XP/coins/title profile and rank card", category: "utility", slash: "/profile [user] [card]", prefix: "profile [@user]", aliases: ["rank", "pf"] },
  { name: "daily", description: "Claim daily XP and coins", category: "utility", slash: "/daily", prefix: "daily" },
  { name: "quests", description: "View daily and weekly quests", category: "utility", slash: "/quests", prefix: "quests", aliases: ["quest"] },
  { name: "leaderboard", description: "Server XP leaderboard", category: "utility", slash: "/leaderboard", prefix: "leaderboard", aliases: ["lb", "top"] },
  { name: "shop", description: "View progression shop catalog", category: "utility", slash: "/shop", prefix: "shop" },
  { name: "relationshipshop", description: "View relationship item shop.", category: "social", slash: "/relationshipshop", prefix: "relationshipshop", aliases: ["rshop"] },
  { name: "relationshipinventory", description: "View relationship inventory.", category: "social", slash: "/relationshipinventory", prefix: "relationshipinventory", aliases: ["rinv"] },
  { name: "relationshipbuy", description: "Buy relationship items.", category: "social", slash: "/relationshipbuy <item> [quantity]", prefix: "relationshipbuy <item> [quantity]", aliases: ["rbuy"] },
  { name: "relationshipuse", description: "Use relationship item.", category: "social", slash: "/relationshipuse <item>", prefix: "relationshipuse <item>", aliases: ["ruse"] },
  { name: "shiprate", description: "Ship two names and get compatibility %", category: "fun", slash: "/shiprate <name1> <name2>", prefix: "shiprate <name1> <name2>", aliases: ["shipping"] },
  { name: "eightball", description: "Magic 8-ball response", category: "fun", slash: "/eightball <question>", prefix: "eightball <question>", aliases: ["8ball", "tellme", "isittrue"] },
  { name: "gay", description: "Gay scanner", category: "fun", slash: "/gay [name]", prefix: "gay [name]", aliases: ["gayscanner"] },
  { name: "insult", description: "Yo momma joke", category: "fun", slash: "/insult [user]", prefix: "insult [@user]", aliases: ["mommajokes"] },
  { name: "say", description: "Make bot say text", category: "fun", slash: "/say <text>", prefix: "say <text>", aliases: ["copy"] },
  { name: "dog", description: "Random dog image + fact", category: "fun", slash: "/dog", prefix: "dog", aliases: ["doggo", "doggie", "doggies"] },
  { name: "cat", description: "Random cat image + fact", category: "fun", slash: "/cat", prefix: "cat", aliases: ["catto", "cattie"] },
  { name: "poke", description: "Poke a user", category: "fun", slash: "/poke <user>", prefix: "poke @user" },
  { name: "action", description: "Run any Weeby action GIF by type", category: "fun", slash: "/action <type> [user]", prefix: "-", aliases: ["act"] },
  { name: "hug", description: "Hug a user with GIF", category: "fun", slash: "/hug [user]", prefix: "hug [@user]" },
  { name: "pat", description: "Pat a user with GIF", category: "fun", slash: "/pat [user]", prefix: "pat [@user]" },
  { name: "kiss", description: "Kiss a user with GIF", category: "fun", slash: "/kiss [user]", prefix: "kiss [@user]" },
  { name: "cuddle", description: "Cuddle a user with GIF", category: "fun", slash: "/cuddle [user]", prefix: "cuddle [@user]" },
  { name: "slap", description: "Slap a user with GIF", category: "fun", slash: "/slap [user]", prefix: "slap [@user]" },
  { name: "highfive", description: "High five a user with GIF", category: "fun", slash: "/highfive [user]", prefix: "highfive [@user]" },
  { name: "bonk", description: "Bonk a user with GIF", category: "fun", slash: "/bonk [user]", prefix: "bonk [@user]" },
  { name: "tickle", description: "Tickle a user with GIF", category: "fun", slash: "/tickle [user]", prefix: "tickle [@user]" },
  { name: "wink", description: "Wink at a user with GIF", category: "fun", slash: "/wink [user]", prefix: "wink [@user]" },
  { name: "owo", description: "Owoify text", category: "fun", slash: "/owo <text>", prefix: "owo <text>" },
  { name: "dare", description: "Random dare question", category: "fun", slash: "/dare", prefix: "dare", aliases: ["d", "dre"] },
  { name: "truth", description: "Random truth question", category: "fun", slash: "/truth", prefix: "truth", aliases: ["t", "true", "tru"] },
  { name: "wyr", description: "Would You Rather question", category: "fun", slash: "/wyr", prefix: "wyr", aliases: ["wouldyou", "wouldyourather"] },
  { name: "nhie", description: "Never Have I Ever question", category: "fun", slash: "/nhie", prefix: "nhie", aliases: ["neverhaveiever"] },
  { name: "urban", description: "Urban dictionary lookup", category: "fun", slash: "/urban <term>", prefix: "urban <term>", aliases: ["urbandict", "dict", "df"] },
  { name: "rps", description: "Rock Paper Scissors", category: "fun", slash: "/rps <choice>", prefix: "rps <choice>" },
  { name: "randomresponse", description: "Random JSON responses with next/refresh buttons", category: "fun", slash: "/randomresponse <type> [number] [quote_card]", prefix: "-" , aliases: ["rr", "randomjson"] },
  { name: "triggered", description: "Generate triggered GIF from avatar", category: "image", slash: "/triggered [user] [tint]", prefix: "triggered [@user]", aliases: ["trig"] },
  { name: "thisisspotify", description: "Generate This Is Spotify style image", category: "image", slash: "/thisisspotify [text] [color] [user]", prefix: "thisisspotify [@user] [text] [| hex]", aliases: ["tis", "spotifythis"] },
  { name: "tweet", description: "Generate fake tweet image (supports message link/reply)", category: "image", slash: "/tweet [text] [message_link] [username] [user]", prefix: "tweet (reply to a message) or tweet [@user] [text]", aliases: ["tw"] },
  { name: "tweet this", description: "Context menu: turn any message into tweet image", category: "image", slash: "Apps -> Message -> Tweet This" },
  { name: "spotifynp", description: "Generate Spotify now playing card", category: "image", slash: "/spotifynp [title] [artist] [album] [user]", prefix: "spotifynp [@user] [title | artist | album]", aliases: ["snp", "np"] },
  { name: "uk07", description: "Generate UK07 style caption image", category: "image", slash: "/uk07 [text] [message_link]", prefix: "uk07 <text> or reply + uk07", aliases: ["uk"] },
  { name: "quote", description: "Generate quote card (supports message link/reply)", category: "image", slash: "/quote [text] [message_link] [author] [user]", prefix: "quote (reply to a message) or quote [@user] [text] [| author]", aliases: ["qt"] },
  { name: "quote this", description: "Context menu: turn any message into quote image", category: "image", slash: "Apps -> Message -> Quote This" },
  { name: "eject", description: "Among Us eject meme", category: "image", slash: "/eject [text] [outcome] [user]", prefix: "eject [@user] [text] [outcome]", aliases: ["sus"] },
  { name: "friendship", description: "Generate friendship banner", category: "image", slash: "/ship [user1] [user2]", prefix: "ship [@user1] [@user2]", aliases: ["friends", "ship"] },
  { name: "demotivational", description: "Generate demotivational poster", category: "image", slash: "/demotivational [title] <text> [user]", prefix: "demotivational [@user] <text> [| title]", aliases: ["demo", "demot"] },
  { name: "rip", description: "Generate RIP gravestone meme", category: "image", slash: "/rip [user] [message]", prefix: "rip [@user] [message]", aliases: ["grave"] },
  { name: "simp", description: "Generate custom simp ID card", category: "image", slash: "/simp [user]", prefix: "simp [@user]", aliases: ["simpcard"] },
  { name: "petpet", description: "Generate pet-pet GIF", category: "image", slash: "/petpet [user]", prefix: "petpet [@user]", aliases: ["patpat", "pet"] },
  { name: "avsplit", description: "Combine two avatars side-by-side", category: "image", slash: "/avsplit [user1] [user2]", prefix: "avsplit [@user1] [@user2]", aliases: ["split"] },
  { name: "achievement", description: "Generate achievement image + text", category: "image", slash: "/achievement <text> [user]", prefix: "achievement [@user] <text>" },
  { name: "bartchalkboard", description: "Generate Bart chalkboard image + text", category: "image", slash: "/bartchalkboard <text> [user]", prefix: "bartchalkboard [@user] <text>", aliases: ["bart"] },
  { name: "changemymind", description: "Generate Change My Mind image + text", category: "image", slash: "/changemymind <text> [user]", prefix: "changemymind [@user] <text>", aliases: ["cmm"] },
  { name: "lisapresentation", description: "Generate Lisa presentation image + text", category: "image", slash: "/lisapresentation <text> [user]", prefix: "lisapresentation [@user] <text>", aliases: ["lisa"] },
  { name: "jimwhiteboard", description: "Generate Jim whiteboard image + text", category: "image", slash: "/jimwhiteboard <text> [user]", prefix: "jimwhiteboard [@user] <text>", aliases: ["jim"] },
  {
    name: "overlays",
    description: "Avatar overlays (approved, bazinga, caution, christmas, easter, fire, glass, halloween, hearts, jail, rainbow, rejected, snow, thuglife, balance, brilliance, bravery, wasted)",
    category: "image",    
    slash: "/approved /bazinga ... /wasted [user]",
    prefix: "approved|bazinga|...|wasted [@user]"
  }
];

export const helpCategoryLabels: Record<HelpCategory, string> = {
  overview: "Overview",
  utility: "Utility",
  fun: "Fun",
  social: "Social",
  configuration: "Configuration",
  image: "Image Generators"
};

const aliasMap = new Map<string, string>();
for (const cmd of commandCatalog) {
  aliasMap.set(cmd.name.toLowerCase(), cmd.name);
  for (const alias of cmd.aliases ?? []) {
    aliasMap.set(alias.toLowerCase(), cmd.name);
  }
}

export function resolveCommandName(input: string) {
  return aliasMap.get(input.toLowerCase()) ?? null;
}

export function findCommandDoc(input: string) {
  const name = resolveCommandName(input) ?? input.toLowerCase();
  return commandCatalog.find((c) => c.name.toLowerCase() === name) ?? null;
}

export const prefixAliasMap: Record<string, string> = Object.fromEntries(
  [...aliasMap.entries()].filter(([alias, canonical]) => alias !== canonical.toLowerCase())
);
