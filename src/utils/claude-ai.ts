import { Anthropic } from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "../../config/env";
import { MessageParam } from "@anthropic-ai/sdk/resources";
import { Logger, createLogger, format, transports } from "winston";

const logger: Logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "error.log", level: "error" }),
    new transports.File({ filename: "combined.log" }),
  ],
});

class ClaudeLLM {
  private anthropic: Anthropic;
  private model: string;

  constructor(
    apiKey: string = ANTHROPIC_API_KEY,
    modelName: string = "claude-3-haiku-20240307"
  ) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = modelName;
  }

  async chatComplete(message: MessageParam): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 1,
        system:
          '**피트, Fitculator의 피트니스 개인 트레이닝 AI**\n\n**자세한 답변을 위한 지침**\n- 당신은 운동 코치 AI로, 운동이나 식단과 관련되지 않은 질문에 대한 답변은 하면 절대로 안돼요.\n- 질문에 대답할 때는 "무엇인지," "왜 중요한지," 그리고 "어떻게 해야 하는지"를 포함해 포괄적인 설명을 제공하세요.\n- 포인트를 명확히 하기 위해 다양한 예시나 비유를 자유롭게 사용하세요.\n- 관련 부주제나 자주 나오는 후속 질문들도 선제적으로 다루세요.\n- 개념이 복잡한 경우, 파트별로 나눠 각 부분을 철저히 설명하세요.\n**톤과 스타일**\n- 따뜻하고 사용자 친화적인 분위기를 유지하면서, 적절한 이모지와 마크다운(테이블 제외)을 사용해 강조하세요. \n- 말투는 해요체를 필수적으로 채용해서 사용해야해요.\n- 피트니스에 대해 호기심이 많고 열정적인 친구에게 설명한다는 느낌으로 정보를 쉽게 풀어 설명하세요.\n- 리처드 파인만이 복잡한 과학을 비유를 통해 간단히 설명하는 \b이야기해야해요.\n**세부적인 커뮤니케이션**\n- 간략한 답변으로 시작한 후, 지지하는 세부적인 내용을 이어서 제공하세요.\n- 헤더, 리스트, 그리고 굵은 글씨를 사용해 답변을 구성하고 주요 포인트를 강조하세요.\n- 권위 있는 출처나 업계 기준에 근거한 실용적인 팁과 지침을 제공하세요.\n- 주의해야 할 잠재적인 오해나 흔히 발생하는 실수들을 다뤄주세요.\n- 적절할 때, 가상 사용자 시나리오를 기반으로 한 맞춤형 제안을 제시하세요.\n - 당신은 전설적인 피트니스 코치로써 정확한 전문용어를 숙지하고 있어요. (ex: 플라이오 혹은 점프 훈련(Plyometric Exercise), 등척성 운동(Isometric contraction), 등장성 운동(Isotonic contraction))\n - 호칭을 "사용자님"으로 말투를 "해요체"를 사용해. 그리고 지칭하는 대상을 명확히 알 경우에는 "그, 이, 저"같은 지칭명사의 사용을 금지하고 대상의 명사를 명확히 사용해야해.\n- 말투는 해요체를 사용해야해.',
        messages: [message],
      });
      return response.content[0].text;
    } catch (error) {
      logger.error("Error in chatComplete:", error);
      throw new Error("Failed to generate chat completion");
    }
  }
}

class ClaudeMoA {
  private claudeLLMHaiku: ClaudeLLM;
  private claudeLLMSonnet: ClaudeLLM;

  constructor(
    apiKey: string = process.env.ANTHROPIC_API_KEY!,
    haikuModelName: string = "claude-3-haiku-20240307",
    sonnetModelName: string = "claude-3-5-sonnet-20240620"
  ) {
    this.claudeLLMHaiku = new ClaudeLLM(apiKey, haikuModelName);
    this.claudeLLMSonnet = new ClaudeLLM(apiKey, sonnetModelName);
  }

  async generateResponse(message: string, n: number = 3) {
    try {
      const candidateResponses = await Promise.all(
        Array(n)
          .fill(null)
          .map(() =>
            this.claudeLLMHaiku.chatComplete({
              role: "user",
              content: message,
            })
          )
      );

      const integratedResopnse = candidateResponses
        .map((resp, i) => `### Response ${i + 1}:\n${resp}`)
        .join("###\n\n");

      const analysisPrompt = `###유저질문:\n${message}\n\n후보 답변들의 강점과 약점을 상세히 분석해줘.:\n
        ${integratedResopnse}`;

      const analysisResponse = await this.claudeLLMSonnet.chatComplete({
        role: "user",
        content: analysisPrompt,
      });

      const finalResponse = await this.claudeLLMSonnet.chatComplete({
        role: "user",
        content: `${integratedResopnse}###전문가 평론:${analysisResponse}###\n위의 답변과 비평을 참고하고 너가 볼때 추가해야할 정보들을 추가해서  \"${message}\" 라는 질문에 하나의 완성된 답변을 만들어주세요.\n`,
      });

      return finalResponse;
    } catch (error) {
      logger.error("Error in generateResponse:", error);
      throw new Error("Failed to generate response");
    }
  }
}

export { ClaudeMoA };
