import { NextRequest, NextResponse } from "next/server";
import { getResolvedTenant } from "@/lib/tenant";

type ChatRequestBody = {
  session_id?: string;
  message?: string;
};

export async function POST(request: NextRequest) {
  const tenant = await getResolvedTenant();
  const body = (await request.json()) as ChatRequestBody;

  const agentBaseUrl = process.env.AGENT_SERVICE_URL;
  if (!agentBaseUrl) {
    return NextResponse.json({ error: "Chat agent is not configured." }, { status: 503 });
  }

  const isFirstTurn = !body.session_id;
  const target = isFirstTurn ? "/chat/start" : "/chat/message";
  const payload = isFirstTurn
    ? { tenant_id: tenant.id, tenant_name: tenant.name, tenant_type: tenant.type }
    : { session_id: body.session_id, tenant_name: tenant.name, message: body.message ?? "" };

  const agentResponse = await fetch(`${agentBaseUrl}${target}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!agentResponse.ok) {
    return NextResponse.json({ error: "Chat agent request failed." }, { status: 502 });
  }

  const data = await agentResponse.json();
  return NextResponse.json(data);
}
