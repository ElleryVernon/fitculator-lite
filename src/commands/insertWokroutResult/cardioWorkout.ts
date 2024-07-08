import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { WorkoutName } from "@prisma/client";
import {
  CARDIO_WORKOUT_CHOICES,
  ERROR_MESSAGES,
} from "../../../config/constants";
import { processCardioWorkout } from "../../services/cardioWorkoutService";
import { prisma } from "../../db";

const insertCardioWorkoutResult = new SlashCommandBuilder()
  .setName("운동업로드-유산소")
  .setDescription("유산소 운동시간과 심박수가 기록된 사진을 전송합니다.")
  .addStringOption((option) =>
    option
      .setName("운동-이름")
      .setDescription("운동 이름을 선택해주세요.")
      .setRequired(true)
      .addChoices(...CARDIO_WORKOUT_CHOICES)
  )
  .addAttachmentOption((option) =>
    option
      .setName("운동-결과")
      .setDescription(
        "운동 결과가 기록된 사진을 선택해주세요.(운동시간, 심박수)"
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("기록-날짜")
      .setDescription("운동 기록 날짜를 선택해주세요.")
      .setRequired(false)
      .addChoices(
        { name: "어제", value: "yesterday" },
        { name: "오늘", value: "today" }
      )
  );

async function execute(interaction: ChatInputCommandInteraction) {
  let isDeferred = false;
  try {
    await interaction.deferReply();
    isDeferred = true;

    const discordId = interaction.user.id;
    const user = await prisma.user.findUnique({
      where: { discord_id: discordId },
      include: { subscriptions: true },
    });

    console.log(user?.subscriptions);

    if (
      !user ||
      !user.subscriptions.some((sub) => sub.endDate && sub.endDate > new Date())
    ) {
      await interaction.editReply("구독 중이 아닙니다. 구독 후 이용해주세요.");
      return;
    }

    const attachment = interaction.options.getAttachment("운동-결과", true);
    const workoutName = interaction.options.getString(
      "운동-이름",
      true
    ) as WorkoutName;
    const recordDate = (interaction.options.getString("기록-날짜") ||
      "today") as "today" | "yesterday";

    const reply = await processCardioWorkout(
      attachment,
      workoutName,
      discordId,
      recordDate
    );
    await interaction.editReply(reply);
  } catch (e) {
    const error = e as Error;
    if (isDeferred) {
      await interaction.editReply(error.message);
    } else {
      console.error("Error occurred before deferring reply:", error);
      await interaction.reply({
        content: "오류가 발생했습니다. 나중에 다시 시도해주세요.",
        ephemeral: true,
      });
    }
  }
}

export default {
  ...insertCardioWorkoutResult,
  execute,
};
