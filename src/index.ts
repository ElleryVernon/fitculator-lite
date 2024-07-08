import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import commands from "./commands";
import { CLIENT_ID, TOKEN } from "../config/env";
import sendRankGraph from "../crons/weekly/sendRankGraph";
import registerCommands from "./slash";
import { prisma } from "./db";
import { parseDateFromString } from "./utils/dateUtils";
import { buildReplyMessage } from "./utils/fitnessUtils";
import { addWeeks } from "date-fns";

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

registerCommands(commands, TOKEN, CLIENT_ID);

client.on("ready", async () => {
  sendRankGraph();
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  console.log(reaction, user);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find(
    (command) => command.name === interaction.commandName
  );

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.log(error);

    await interaction.reply({
      content: "명령을 실행하는 중에 문제가 생겼어요!",
      ephemeral: true,
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isModalSubmit() && interaction.customId === "userInfoModal") {
    const name = interaction.fields.getTextInputValue("nameInput");
    const birthDate = interaction.fields.getTextInputValue("birthdateInput");
    const restingHeartRate = parseInt(
      interaction.fields.getTextInputValue("rhrInput")
    );

    try {
      await interaction.deferReply();

      const userExists = await prisma.user.findUnique({
        where: {
          discord_id: interaction.user.id,
        },
      });

      const birth = parseDateFromString(birthDate);
      let user;

      if (userExists) {
        user = await prisma.user.update({
          where: {
            id: userExists.id,
          },
          data: {
            name: name,
            birth: birth,
            restingHeartRate: restingHeartRate,
            discord_id: interaction.user.id,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            name: name,
            birth: birth,
            restingHeartRate: restingHeartRate,
            discord_id: interaction.user.id,
          },
        });
      }

      const replyMessage = buildReplyMessage(user);
      const dmChannel = await interaction.user.createDM();
      await dmChannel.send(`나의 기본 정보 입니다.\n${replyMessage}`);
      await interaction.editReply(`기본 정보가 등록되었습니다!`);
    } catch (error) {
      console.error("Error occurred while inserting user info:", error);
      await interaction.editReply(
        "정보를 불러오는 중 문제가 발생했습니다. 관리자에게 문의하세요."
      );
    }
  }
});

client.on("guildMemberAdd", async (member) => {
  const WELCOME_CHANNEL_ID = "1224929008274116712";
  try {
    let user = await prisma.user.findUnique({
      where: {
        discord_id: member.id,
      },
      include: {
        subscriptions: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discord_id: member.id,
          nickname: member.user.username,
          createdAt: new Date(),
        },
        include: {
          subscriptions: true,
        },
      });

      const endDate = addWeeks(new Date(), 1);
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          endDate: endDate,
        },
      });

      const welcomeChannel =
        member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
      if (welcomeChannel && welcomeChannel.isTextBased()) {
        await welcomeChannel.send(
          `<@${
            member.id
          }> 님, 환영합니다! 첫 입장 기념으로 1주일 무료 사용 기회를 드립니다. 구독 종료일: ${
            endDate.toISOString().split("T")[0]
          }`
        );
      }
    } else {
      const createdAt = user.createdAt;
      if (!createdAt) {
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            createdAt: new Date(),
          },
        });
      }
    }
  } catch (error) {
    console.error("Error occurred while processing new member:", error);
  }
});

client.login(TOKEN);
