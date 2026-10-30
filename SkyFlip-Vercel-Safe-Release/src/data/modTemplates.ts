export const getFabricModSource = (serverUrl: string, token: string) => `package com.seikeyoflipper.companion;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.minecraft.client.MinecraftClient;
import net.minecraft.scoreboard.Scoreboard;
import net.minecraft.scoreboard.ScoreboardDisplaySlot;
import net.minecraft.scoreboard.ScoreboardObjective;
import net.minecraft.sound.SoundEvents;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SeikeyoFlipper Minecraft Fabric 26.2 Mod Companion
 * Sends scoreboard purse balance every 2 seconds to SkyFlip backend.
 * Receives /viewauction notifications and renders clickable chat links in Minecraft.
 */
@Environment(EnvType.CLIENT)
public class SeikeyoFlipperFabricClient implements ClientModInitializer {

    public static final String MOD_ID = "seikeyoflipper";
    public static final String VERSION = "26.2.0";

    // SkyFlip Server & Secret Token Configuration
    private static final String SERVER_URL = "${serverUrl}";
    private static final String MOD_TOKEN = "${token}";
    private static final int SYNC_INTERVAL_TICKS = 40; // Every 2 seconds (20 ticks/sec)

    private final Gson gson = new Gson();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private int tickCounter = 0;
    private long cachedPurse = 0;
    private boolean isSyncing = false;

    @Override
    public void onInitializeClient() {
        System.out.println("[SeikeyoFlipper] Initializing Fabric 26.2 client mod...");
        System.out.println("[SeikeyoFlipper] Connecting to SkyFlip AH Flipper: " + SERVER_URL);

        // Register client tick listener for non-blocking background polling
        ClientTickEvents.END_CLIENT_TICK.register(this::onClientTick);
    }

    private void onClientTick(MinecraftClient client) {
        if (client.player == null || client.world == null) return;

        tickCounter++;
        if (tickCounter >= SYNC_INTERVAL_TICKS) {
            tickCounter = 0;
            updatePurseFromScoreboard(client);
            if (!isSyncing) {
                syncWithWebCompanion(client);
            }
        }
    }

    /**
     * Extracts player's purse from Hypixel scoreboard in modern Minecraft
     */
    private void updatePurseFromScoreboard(MinecraftClient client) {
        try {
            Scoreboard scoreboard = client.world.getScoreboard();
            if (scoreboard == null) return;

            ScoreboardObjective objective = scoreboard.getObjectiveForSlot(ScoreboardDisplaySlot.SIDEBAR);
            if (objective == null) return;

            Pattern pursePattern = Pattern.compile("Purse:\\s*([0-9,]+)");
            for (var score : scoreboard.getScoreboardEntries(objective)) {
                String line = score.owner();
                if (line == null) continue;
                Matcher matcher = pursePattern.matcher(line);
                if (matcher.find()) {
                    String cleanCoins = matcher.group(1).replace(",", "");
                    this.cachedPurse = Long.parseLong(cleanCoins);
                    break;
                }
            }
        } catch (Exception ignored) {
            // Non-blocking scoreboard readout
        }
    }

    /**
     * Sends HTTPS POST request every 2s to /api/mod/sync with token, player UUID, and purse
     */
    private void syncWithWebCompanion(MinecraftClient client) {
        if (client.player == null) return;

        isSyncing = true;
        String playerIgn = client.player.getName().getString();
        String playerUuid = client.player.getUuidAsString();

        JsonObject payload = new JsonObject();
        payload.addProperty("token", MOD_TOKEN);
        payload.addProperty("uuid", playerUuid);
        payload.addProperty("minecraftUuid", playerUuid);
        payload.addProperty("ign", playerIgn);
        payload.addProperty("purse", cachedPurse);
        payload.addProperty("purseBalance", cachedPurse);
        payload.addProperty("bank", 0);
        payload.addProperty("modVersion", "26.2.0-FABRIC");
        payload.addProperty("clientType", "FABRIC_26_2");

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(SERVER_URL + "/api/mod/sync"))
                .timeout(Duration.ofSeconds(4))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .header("Authorization", "Bearer " + MOD_TOKEN)
                .header("X-Mod-Key", MOD_TOKEN)
                .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                .build();

        CompletableFuture.supplyAsync(() -> {
            try {
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    return gson.fromJson(response.body(), JsonObject.class);
                }
            } catch (Exception e) {
                // Reconnect handled automatically on next 2s tick
            }
            return null;
        }).thenAcceptAsync(json -> {
            isSyncing = false;
            if (json != null && json.has("commands") && json.get("commands").isJsonArray()) {
                JsonArray commands = json.getAsJsonArray("commands");
                for (JsonElement cmdElement : commands) {
                    JsonObject cmd = cmdElement.getAsJsonObject();
                    String commandStr = cmd.get("command").getAsString();
                    String itemName = cmd.has("itemName") ? cmd.get("itemName").getAsString() : "Auction";
                    long profit = cmd.has("profit") ? cmd.get("profit").getAsLong() : 0;

                    // Execute safely on Minecraft client render thread
                    client.execute(() -> handleReceivedCommand(client, commandStr, itemName, profit));
                }
            }
        });
    }

    /**
     * Renders clickable chat snipe alert. Never automatically purchases items.
     */
    private void handleReceivedCommand(MinecraftClient client, String command, String itemName, long profit) {
        if (client.player == null) return;

        // Play experience orb pickup chime
        if (client.world != null) {
            client.player.playSound(SoundEvents.ENTITY_EXPERIENCE_ORB_PICKUP, 1.0f, 1.0f);
        }

        // Build clickable modern Fabric Text component
        MutableText prefix = Text.literal("[Seikeyo] ").formatted(Formatting.GOLD, Formatting.BOLD);
        MutableText itemText = Text.literal(itemName + " ").formatted(Formatting.YELLOW);
        MutableText profitText = Text.literal("(+" + String.format("%,d", profit) + " coins) ").formatted(Formatting.GREEN);

        MutableText clickButton = Text.literal("[CLICK TO VIEW]")
                .formatted(Formatting.AQUA, Formatting.BOLD)
                .styled(style -> style
                        .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, command))
                        .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Executes " + command).formatted(Formatting.GRAY)))
                );

        prefix.append(itemText).append(profitText).append(clickButton);
        client.player.sendMessage(prefix, false);
    }
}
`;

export const getFabricModJson = (serverUrl: string) => `{
  "schemaVersion": 1,
  "id": "seikeyoflipper",
  "version": "26.2.0",
  "name": "SeikeyoFlipper Fabric Companion",
  "description": "Hypixel Skyblock AH Flipper companion for Fabric 26.2 with live purse sync and 1-click /viewauction snipes.",
  "authors": [
    "SeikeyoFlipper Team"
  ],
  "contact": {
    "homepage": "${serverUrl}"
  },
  "license": "MIT",
  "environment": "client",
  "entrypoints": {
    "client": [
      "com.seikeyoflipper.companion.SeikeyoFlipperFabricClient"
    ]
  },
  "depends": {
    "fabricloader": ">=0.15.0",
    "minecraft": ">=1.20.2",
    "java": ">=17",
    "fabric-api": "*"
  }
}
`;

export const getFabricBuildGradle = () => `plugins {
    id 'fabric-loom' version '1.6-SNAPSHOT'
    id 'maven-publish'
}

version = '26.2.0'
group = 'com.seikeyoflipper'

repositories {
    mavenCentral()
}

dependencies {
    minecraft "com.mojang:minecraft:1.20.4"
    mappings "net.fabricmc:yarn:1.20.4+build.3:v2"
    modImplementation "net.fabricmc:fabric-loader:0.15.7"
    modImplementation "net.fabricmc.fabric-api:fabric-api:0.96.4+1.20.4"
    implementation "com.google.code.gson:gson:2.10.1"
}

processResources {
    inputs.property "version", project.version
    filesMatching("fabric.mod.json") {
        expand "version": project.version
    }
}
`;

export const getConfigFileContent = (serverUrl: string, token: string) => {
  return JSON.stringify({
    serverUrl,
    token,
    pollIntervalMs: 2000,
    headers: {
      "Authorization": "Bearer " + token,
      "X-Mod-Key": token
    },
    client: "SeikeyoFlipper-Fabric-26.2",
    autoCopyCommandToClipboard: false,
    playCustomSound: true,
    showChatAlerts: true
  }, null, 2);
};

export const getChatTriggersScript = (serverUrl: string, token: string) => `/// <reference types="../CTAutocomplete" />
/// <reference lib="es2015" />

// SeikeyoFlipper ChatTriggers Module
// Drop this in .minecraft/config/ChatTriggers/modules/seikeyoflipper/index.js

const SERVER_URL = "${serverUrl}";
const MOD_TOKEN = "${token}";

register("step", () => {
  if (!Player.getPlayer()) return;

  const ign = Player.getName();
  const uuid = Player.getUUID().replace(/-/g, "");
  let purse = 0;

  // Extract purse from scoreboard
  Scoreboard.getLines().forEach(line => {
    const unformatted = ChatLib.removeFormatting(line.getName());
    const match = unformatted.match(/Purse:\\s*([0-9,]+)/);
    if (match) {
      purse = parseInt(match[1].replace(/,/g, ""), 10);
    }
  });

  new Thread(() => {
    try {
      const conn = new java.net.URL(SERVER_URL + "/api/mod/sync").openConnection();
      conn.setRequestMethod("POST");
      conn.setRequestProperty("Content-Type", "application/json");
      conn.setRequestProperty("Authorization", "Bearer " + MOD_TOKEN);
      conn.setRequestProperty("X-Mod-Key", MOD_TOKEN);
      conn.setDoOutput(true);

      const payload = JSON.stringify({
        token: MOD_TOKEN,
        uuid: uuid,
        minecraftUuid: uuid,
        ign: ign,
        purse: purse,
        purseBalance: purse,
        bank: 0,
        modVersion: "26.2.0-FABRIC",
        clientType: "FABRIC_26_2"
      });

      const os = conn.getOutputStream();
      os.write(new java.lang.String(payload).getBytes("UTF-8"));
      os.close();

      const reader = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream()));
      let response = "";
      let line;
      while ((line = reader.readLine()) !== null) {
        response += line;
      }
      reader.close();

      const data = JSON.parse(response);
      if (data.commands && data.commands.length > 0) {
        data.commands.forEach(cmd => {
          World.playSound("random.orb", 1, 1);
          new Message(
            new TextComponent("&6&l[Seikeyo] &e" + cmd.itemName + " &a(+" + (cmd.profit / 1e6).toFixed(1) + "M) "),
            new TextComponent("&b&l[BUY]")
              .setClick("run_command", cmd.command)
              .setHoverValue("&7Click to run " + cmd.command)
          ).chat();
        });
      }
    } catch (e) {}
  }).start();
}).setDelay(2);

ChatLib.chat("&a[SeikeyoFlipper] Companion module active! Connected to &e" + SERVER_URL);
`;
