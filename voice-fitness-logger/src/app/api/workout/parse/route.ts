import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { appAi } from "@/lib/eazo-ai-billing";

export interface ParsedExercise {
  exercise_name: string;
  weight: string;
  sets: string;
  workout_date: string; // ISO string
}

const SYSTEM_PROMPT = `你是一个专业健身教练助手，专门解析中文健身训练描述。

用户会用自然语言描述今天的训练，你需要将其解析为结构化数据。

输出格式：JSON数组，每个动作一条记录。

字段说明：
- exercise_name: 动作名称字符串（如"哑铃推肩"、"卧推"、"深蹲"等，保留用户原始描述）
- weight: 重量字符串，格式化为标准形式（如"6lbs"、"100kg"、"自重"等，无重量信息时填空字符串""）注意必须是字符串
- sets: 组数/次数字符串，格式化为标准形式（如"4组"、"2*12和2*10"、"3*8"等）注意必须是字符串
- workout_date: 训练日期字符串，使用输入中提供的当前时间（ISO 8601格式，带时区）

规则：
1. 若一句话包含多个动作，生成多条记录
2. 动作如有同音字输入错误纠正为正确汉字，如用户描述“工二头肌”应为“肱二头肌”，
3. weight标准化：识别千克或磅为单位，显示kg或lbs，不要出现类似“8000克”或”8千克“的数据
4. workout_date 默认为当前时间，或者输入中提到的具体日期，不得设置为未来
5. 组数描述标准化：
   - "四组，两组十二个和两组十个" → "2*12和2*10"
   - "三组十个" → "3*10"
   - "四组" → "4组"（无具体次数时保留组数描述）
6. 若无法识别有效的健身动作，返回空数组 []
7. 只返回JSON数组，不要其他文字

示例输入：今天练了哑铃推肩四组，两组十二个和两组十个，重量是6kg
示例输出：[{"exercise_name":"哑铃推肩","weight":"6kg","sets":"2*12和2*10","workout_date":"2024-01-15T10:30:00+08:00"}]`;

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  let text: string;
  try {
    const body = await request.json();
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  try {
    const result = await appAi.chat({
      model: process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.1",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `当前时间：${now}\n\n用户输入：${text}`,
        },
      ],
      max_tokens: 1024,
    });

    const raw = (result.choices as Array<{ message?: { content?: string | null } }>)?.[0]?.message?.content ?? "[]";

    // Extract JSON array from response
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      return NextResponse.json({ exercises: [] });
    }

    let exercises: ParsedExercise[];
    try {
      exercises = JSON.parse(match[0]);
    } catch {
      return NextResponse.json({ exercises: [] });
    }

    // Validate and sanitize each exercise
    // Note: LLM sometimes returns weight/sets as numbers — coerce to string
    const validated: ParsedExercise[] = [];
    for (const ex of exercises) {
      if (typeof ex.exercise_name !== "string" || !ex.exercise_name.trim()) continue;
      validated.push({
        exercise_name: String(ex.exercise_name).trim(),
        weight: ex.weight != null ? String(ex.weight).trim() : "",
        sets: ex.sets != null ? String(ex.sets).trim() : "",
        workout_date: typeof ex.workout_date === "string" && ex.workout_date
          ? ex.workout_date
          : now,
      });
    }

    return NextResponse.json({ exercises: validated });
  } catch (err) {
    console.error("[workout/parse] AI error:", err);
    return NextResponse.json({ error: "AI parsing failed" }, { status: 500 });
  }
}
