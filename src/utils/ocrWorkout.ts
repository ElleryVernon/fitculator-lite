import axios from "axios";
import FormData from "form-data";
import { createId } from "@paralleldrive/cuid2";
import { downloadImageAsBuffer } from "./networkUtils";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "../../config/env";
import OpenAI from "openai";

const API_URL =
	"https://vdqmvtsjmn.apigw.ntruss.com/custom/v1/31770/108dacc74e4a57445adc95b87141d577bc405b9cd8fed33747c6fe3dfd02a081/general";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface OCRMessage {
	images: Array<{ format: string; name: string }>;
	requestId: string;
	timestamp: number;
	version: string;
}

async function recognizeImage(imageBuffer: Buffer): Promise<string> {
	const message: OCRMessage = {
		images: [
			{
				format: "jpg",
				name: "file.jpg",
			},
		],
		requestId: createId(),
		timestamp: Date.now(),
		version: "V2",
	};

	const formData = new FormData();
	formData.append("file", imageBuffer, { filename: "file.jpg" });
	formData.append("message", JSON.stringify(message));

	try {
		const response = await axios.post(API_URL, formData, {
			headers: {
				"X-OCR-SECRET": process.env.CLOVA_API_KEY!,
				...formData.getHeaders(),
			},
		});

		if (response.status === 200) {
			const texts = response.data.images[0].fields.map((field: any) => field.inferText);
			return texts.join(" ");
		} else {
			throw new Error(`Unexpected response status: ${response.status}`);
		}
	} catch (error) {
		console.error("OCR Error:", error);
		throw error;
	}
}

const ocrWorkout = async (url: string): Promise<string | null> => {
	try {
		const imageBuffer = await downloadImageAsBuffer(url);
		const ocrText = await recognizeImage(imageBuffer);

		const finalResponse = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "system",
					content:
						"** 너는 전설적인 OCR 전문가이자 한국어 전문가야. ** \n- OCR로 추출한 텍스트를 전달하면 오로지 운동시간(Minute, 분 단위로 반올림)와 평균심박수(BPM, 세자리)을 두 가지 정보의 숫자만 순서대로 추출해줘. (example: 76, 120) \n- 운동시간과 심박수 중에 하나라도 알 수 없을 경우 추측하지마.",
				},
				{
					role: "assistant",
					content: "네 알겠습니다.",
				},
				{
					role: "user",
					content:
						"SKT 6:07 f 91% h 46:31 3월 22일 (금) 오후 9:15-오후 10:01 운동 상세정보 평균 심박수 최대 심박수 126bpm 159bpm 운동 칼로리 총 칼로리 354kcal 354kcal 운동 시간 총 시간 00:46:31 00:46:32 차트 심박수 <",
				},
				{
					role: "assistant",
					content: "47, 126",
				},
				{
					role: "user",
					content:
						'a Triple Threat TRIPLE 20 2024 08:15PM - Wed Mar LION HEART THREAT F45 Gwanghwamun 50 100 45 pts "title "" 40 80 70 % 30 60 20 40 10 20 5 10 15 20 25 30 35 40 45 Mins 47.2 567 AVE 165 Pts Cal BPM',
				},
				{
					role: "assistant",
					content: "45, 165",
				},
				{
					role: "user",
					content: `두타지옥
오전 7:17 2024. 7. 67
6
8
LS
6
4 삼거리
9
E
11
2
11
번천리
댓재휴게소 13
8
20 °C
COROS
13.16 km 재국
거리
7:08:50 1.84 km/h 3.54 km/h
최고(1Km) i
운동 시간 평균 속도
109 1115 m 2647 kcal
bpm 칼로리
평균 심박수 누적 상승
240 TL 높음
훈련부하 i`,
				},
				{
					role: "assistant",
					content: "429, 109",
				},
				{
					role: "user",
					content: `< 러닝
개요 통계 랩 차트 장비
,
00
신교동 궁정동 북촌 한옥마을
옥인동
효자동
와룡동
경 창경궁
888
누상동 소격동
필운대로
누하동
재동
체부동 율곡로
무악동 송현동 M 운니동 권농동
인왕산로
중학동
OF
사직동 내자동
관 23° 2
「Google 동 내수동 수송동
더 느림 더 빠름
+
7월 8일 @ 9:41 오후
러닝
진행 상황이 어떻습니까? 메모 추가
10.04 km
거리
5:37 M
150 bpm ~^^ /km
평균 심박수 평균 페이스
56:25 485
총 시간 총 칼로리`,
				},
				{
					role: "assistant",
					content: "56, 150",
				},
				{
					role: "user",
					content: ocrText,
				},
			],
			temperature: 0.2,
			max_tokens: 200,
			top_p: 1,
			frequency_penalty: 0,
			presence_penalty: 0,
		});

		return finalResponse.choices[0].message.content;
	} catch (error) {
		console.error("OCR Workout Error:", error);
		return null;
	}
};

export default ocrWorkout;
