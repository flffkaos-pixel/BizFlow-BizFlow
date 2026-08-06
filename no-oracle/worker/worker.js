// Cloudflare Worker - 오라클 없는 버전의 카톡 웹훅 게이트웨이
//
// 역할:
//  1. 카카오톡 챗봇이 보낸 문의를 받아 KV에 저장 (큐 역할)
//  2. 고객에게 "잠시만요" 즉시 응답 (simpleText)
//  3. GitHub Actions가 처리한 답변을 KV에서 꺼내 카카오로 회신
//
// 배포:
//  npm i -g wrangler
//  wrangler login
//  wrangler kv namespace create QUEUE
//  wrangler publish
//
// 바인딩 (wrangler.toml):
//  kv_namespaces = [{ binding = "QUEUE", id = "<KV_ID>" }]
//  vars = { KAKAO_CALLBACK_URL = "https://..." }

async function readBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ── 헬스체크 ──────────────────────────────
    if (path === "/health") {
      return json({ ok: true, time: Date.now() });
    }

    // ── 카카오 웹훅 수신 (POST /kakao) ─────────
    if (path === "/kakao" && request.method === "POST") {
      const body = await readBody(request);
      const userReq = body.userRequest || {};
      const user = userReq.user || {};
      const utterance = userReq.utterance || "";
      const userId = user.id || body.userId || "unknown";

      if (!utterance) {
        return kakaoReply("죄송합니다, 메시지를 이해하지 못했어요. 다시 말씀해주세요.");
      }

      // 1) 큐에 저장
      const msgId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await env.QUEUE.put(
        msgId,
        JSON.stringify({
          msgId,
          userId,
          utterance,
          receivedAt: new Date().toISOString(),
          status: "pending",
        })
      );
      await env.QUEUE.put(`user_${userId}`, msgId);

      // 2) 즉시 응답 (AI 처리 완료 전)
      return kakaoReply("상담사 확인 중입니다. 잠시만요! ⏳");
    }

    // ── GA가 답변을 등록 (POST /reply) ────────
    // body: { msgId, reply }
    if (path === "/reply" && request.method === "POST") {
      const body = await readBody(request);
      const msgId = body.msgId;
      if (!msgId) return json({ error: "msgId 필요" }, 400);

      const current = await env.QUEUE.get(msgId, "json");
      if (!current) return json({ error: "msgId 없음" }, 404);

      const updated = { ...current, status: "replied", reply: body.reply, repliedAt: new Date().toISOString() };
      await env.QUEUE.put(msgId, JSON.stringify(updated));

      // (선택) 카카오 간편봇 콜백 호출 → 실제 사용자에게 push
      if (env.KAKAO_CALLBACK_URL) {
        await fetch(env.KAKAO_CALLBACK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            msgId,
            userId: current.userId,
            text: body.reply,
          }),
        }).catch(() => {});
      }

      return json({ ok: true, status: "replied" });
    }

    // ── GA가 대기 메시지 목록 조회 (GET /pending) ──
    // 여기서는 간단히 최근 pending 메시지를 읽는다.
    if (path === "/pending" && request.method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);
      const list = await env.QUEUE.list({ prefix: "m_", limit: 200 });
      const pending = [];
      for (const key of list.keys) {
        const val = await env.QUEUE.get(key.name, "json");
        if (val && val.status === "pending") {
          pending.push(val);
          if (pending.length >= limit) break;
        }
      }
      return json({ pending });
    }

    // ── GA가 처리 완료 표시 (POST /complete) ──
    if (path === "/complete" && request.method === "POST") {
      const body = await readBody(request);
      const msgId = body.msgId;
      if (!msgId) return json({ error: "msgId 필요" }, 400);
      const current = await env.QUEUE.get(msgId, "json");
      if (!current) return json({ error: "msgId 없음" }, 404);
      const updated = { ...current, status: "done", reply: body.reply };
      await env.QUEUE.put(msgId, JSON.stringify(updated));
      return json({ ok: true });
    }

    return json({ error: "Not Found" }, 404);
  },
};

function kakaoReply(text) {
  return new Response(
    JSON.stringify({
      version: "2.0",
      template: { outputs: [{ simpleText: { text } }] },
    }),
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
