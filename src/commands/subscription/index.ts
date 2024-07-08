// subscribeCommand.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db";
import { client } from "../..";
import { addMonths } from "date-fns";
import { User, UserSubscription } from "@prisma/client";

const ADMIN_ROLE_NAME = "Admin";

const subscribe = {
  ...new SlashCommandBuilder()
    .setName("구독")
    .setDescription("구독 기간을 선택합니다.")
    .addUserOption((option) =>
      option
        .setName("사용자")
        .setDescription("구독을 추가할 사용자를 선택하세요.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("기간")
        .setDescription("구독 기간을 입력해주세요. (예: 1, 2, 3)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(12)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // @ts-ignore
    const adminRole = interaction.member!.roles.cache.some(
      // @ts-ignore
      (role) => role.name === ADMIN_ROLE_NAME
    );

    if (!adminRole) {
      await interaction.reply(
        "이 명령어를 사용할 권한이 없습니다. 관리자만 사용 가능합니다."
      );
      return;
    }

    const targetUser = interaction.options.getUser("사용자", true);
    const duration = interaction.options.getInteger("기간", true);

    try {
      await interaction.deferReply();

      let user: any | null = await prisma.user.findUnique({
        where: {
          discord_id: targetUser.id,
        },
        include: {
          subscriptions: {
            orderBy: {
              endDate: "desc",
            },
            take: 1,
          },
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            discord_id: targetUser.id,
            nickname: targetUser.username,
          },
        });
      }

      let endDate: Date;
      if (
        !user.subscriptions ||
        user.subscriptions.length === 0 ||
        !user.subscriptions[0].endDate ||
        user.subscriptions[0].endDate < new Date()
      ) {
        endDate = addMonths(new Date(), duration);
        await prisma.userSubscription.create({
          data: {
            userId: user.id,
            endDate: endDate,
          },
        });
      } else {
        endDate = addMonths(user.subscriptions[0].endDate, duration);
        await prisma.userSubscription.update({
          where: {
            id: user.subscriptions[0].id,
          },
          data: {
            endDate: endDate,
          },
        });
      }

      await interaction.editReply(
        `${
          targetUser.username
        }님의 ${duration}개월 구독이 완료되었습니다!\n구독 종료일: ${
          endDate.toISOString().split("T")[0]
        }`
      );
    } catch (error) {
      console.error("Error occurred while processing subscription:", error);
      await interaction.editReply(
        "구독 처리 중 문제가 발생했습니다. 관리자에게 문의하세요."
      );
    }
  },
};

export default subscribe;
