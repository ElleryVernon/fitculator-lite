import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db";
import { parseDateFromString } from "../../utils/dateUtils";
import { buildReplyMessage } from "../../utils/fitnessUtils";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
import { client } from "../..";

const insertUserInfo = {
  ...new SlashCommandBuilder()
    .setName("기본정보등록")
    .setDescription("분석에 필요한 기본정보를 입력합니다. (이름/생년월일/RHR)"),

  async execute(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId("userInfoModal")
      .setTitle("기본 정보 등록");

    const nameInput = new TextInputBuilder()
      .setCustomId("nameInput")
      .setLabel("이름")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("이름을 입력해주세요. (ex: 김운동)")
      .setRequired(true)
      .setMinLength(2);

    const birthdateInput = new TextInputBuilder()
      .setCustomId("birthdateInput")
      .setLabel("생년월일")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("생년월일 8자리를 입력해주세요. (ex: 19991215)")
      .setRequired(true)
      .setMinLength(8)
      .setMaxLength(8);

    const rhrInput = new TextInputBuilder()
      .setCustomId("rhrInput")
      .setLabel("안정시 심박수")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("안정시 심박수를 입력해주세요. (ex: 45)")
      .setRequired(true);

    const nameInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      nameInput
    );
    const birthdateInputRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(birthdateInput);
    const rhrInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      rhrInput
    );

    modal.addComponents(nameInputRow, birthdateInputRow, rhrInputRow);

    await interaction.showModal(modal);
  },
};

export default insertUserInfo;
