import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { appAi } from "@/lib/eazo-ai-billing";
import { db } from "@/lib/db/client";
import { workoutRecords } from "@/lib/db/schema/workout-records";
import { getAdviceForDate, upsertAdvice } from "@/lib/db/queries/workout-advice";
import { count, eq } from "drizzle-orm";

// 应用统一使用东八区（Asia/Shanghai）计算日期，避免服务器 UTC 时区导致的"今天误判为昨天"
const APP_TZ = "Asia/Shanghai";

/** 返回某个时间在东八区的本地日历日 "YYYY-MM-DD" */
function toTZDateStr(date: Date): string {
  // en-CA 输出 YYYY-MM-DD 格式
  return date.toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

/** 计算两个"YYYY-MM-DD"日历日相差的天数（a 相对 b，b 通常是今天） */
function diffDays(dateStr: string, todayStr: string): number {
  const a = new Date(`${dateStr}T00:00:00Z`).getTime();
  const b = new Date(`${todayStr}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

const ADVICE_SYSTEM_PROMPT = `你是一位专业、亲切的私人健身教练。
根据用户最近的健身记录，给出一条今日建议。建议可以涉及：
- 应该练哪个部位（根据训练间隔和频率）
- 恢复与休息提醒
- 拉伸与放松建议
- 饮食或补充建议
- 休息日活动建议

要求：
1. 建议只有一句话，60字以内，口吻轻松自然，像朋友提醒
2. 结合历史记录中真实的训练部位和间隔天数
3. 如果近期没有任何记录，鼓励用户开始训练
4. 只输出建议正文，不要加前缀如"建议：""今日建议："等
5. 使用第二人称"你"`;

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  try {
    // Today in local date string (YYYY-MM-DD) — 统一使用东八区
    const today = toTZDateStr(new Date());

    // Count all user records (for cache invalidation)
    const countRows = await db
      .select({ value: count() })
      .from(workoutRecords)
      .where(eq(workoutRecords.userId, userId));
    const currentCount = Number(countRows[0]?.value ?? 0);

    // Return cached advice if record count hasn't changed today
    const cached = await getAdviceForDate(userId, today);
    if (cached && cached.recordCount === currentCount) {
      return NextResponse.json({ advice: cached.advice, cached: true });
    }

    // Fetch recent records for LLM context (last 30 entries, oldest first)
    const recentRecords = await db
      .select({
        workoutDate: workoutRecords.workoutDate,
        exerciseName: workoutRecords.exerciseName,
        weight: workoutRecords.weight,
        sets: workoutRecords.sets,
      })
      .from(workoutRecords)
      .where(eq(workoutRecords.userId, userId))
      .orderBy(workoutRecords.workoutDate)
      .limit(30);

    // Summarize records into readable text for LLM
    // 每条记录标注相对今天的天数，避免 LLM 自行推算日期出错
    const summaryLines = recentRecords.map((r) => {
      const recDate = toTZDateStr(new Date(r.workoutDate));
      const d = diffDays(recDate, today);
      const rel = d === 0 ? "今天" : d === 1 ? "昨天" : d === 2 ? "前天" : d > 0 ? `${d}天前` : "未来";
      const parts = [`${recDate}（${rel}）`, r.exerciseName];
      if (r.weight) parts.push(r.weight);
      if (r.sets) parts.push(r.sets);
      return parts.join(" ");
    });

    const historyText =
      summaryLines.length > 0 ? summaryLines.join("\n") : "（暂无训练记录）";

    const todayStr = new Date().toLocaleDateString("zh-CN", {
      timeZone: APP_TZ,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });

    const result = await appAi.chat({
      model: process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.1",
      messages: [
        { role: "system", content: ADVICE_SYSTEM_PROMPT },
        {
          role: "user",
          content: `今天是${todayStr}。\n\n用户最近的训练记录如下（每条已标注相对今天的时间，请直接采用，不要自行推算日期）：\n${historyText}\n\n请给出今日建议。`,
        },
      ],
      max_tokens: 128,
    });

    const raw =
      (result.choices as Array<{ message?: { content?: string | null } }>)?.[0]
        ?.message?.content ?? "";

    const advice = raw.trim() || "今天状态怎么样？来一组热身开始吧！";

    // Cache the result
    await upsertAdvice(userId, today, advice, currentCount);

    return NextResponse.json({ advice, cached: false });
  } catch (err) {
    console.error("[workout/advice] error:", err);
    return NextResponse.json(
      { error: String(err), advice: "保持节奏，今天也加油吧！" },
      { status: 500 }
    );
  }
}
