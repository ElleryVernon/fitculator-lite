// subscriptionInfoCommand.ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db";
import { format } from "date-fns";

const checkSubscription = {
  ...new SlashCommandBuilder()
    .setName("구독정보")
    .setDescription("자신의 구독 정보와 구독 종료일을 확인합니다."),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply();

      const user = await prisma.user.findFirst({
        where: {
          discord_id: interaction.user.id,
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
        await interaction.editReply(
          "등록된 사용자 정보가 없습니다. 먼저 `/기본정보등록` 명령어로 사용자 정보를 등록해주세요."
        );
        return;
      }

      if (!user.subscriptions || user.subscriptions.length === 0) {
        await interaction.editReply(
          "구독 정보가 없습니다. `/구독` 명령어로 구독을 시작할 수 있습니다."
        );
        return;
      }

      const latestSubscription = user.subscriptions[0];
      const formattedEndDate = format(
        latestSubscription.endDate!,
        "yyyy년 MM월 dd일"
      );

      await interaction.editReply(
        `현재 구독 정보입니다.\n구독 종료일: ${formattedEndDate}`
      );
    } catch (error) {
      console.error(
        "Error occurred while processing subscription info:",
        error
      );
      await interaction.editReply(
        "구독 정보를 확인하는 중 문제가 발생했습니다. 관리자에게 문의하세요."
      );
    }
  },
};

export default checkSubscription;
