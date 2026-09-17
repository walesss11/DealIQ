import type { Finding } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { askPactIQChat, ChatFocusContext, ChatSourceCitation, ChatNegotiationAction } from "@/lib/ai/chat";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOrCreateConversation,
  getConversationWithMessages,
  addChatMessage,
  getRecentChatMessages,
  clearChatMessages,
} from "@/lib/db/chatDb";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contractId } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            reviews: {
              where: { status: "complete" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!contract || (contract.userId && contract.userId !== user.id)) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const { conversation, messages } = await getConversationWithMessages(contractId);

    // Format persisted messages for frontend
    const formattedMessages = messages.map((m) => {
      let sources: ChatSourceCitation[] | undefined;
      if (m.sources) {
        try {
          sources = JSON.parse(m.sources);
        } catch {
          sources = undefined;
        }
      }

      let negotiationAction: ChatNegotiationAction | null | undefined;
      if (m.negotiation_action) {
        try {
          negotiationAction = JSON.parse(m.negotiation_action);
        } catch {
          negotiationAction = undefined;
        }
      }

      let focusLabel: string | undefined;
      if (m.focus_context) {
        try {
          const parsedFocus = JSON.parse(m.focus_context) as ChatFocusContext;
          focusLabel = parsedFocus.label;
        } catch {
          focusLabel = undefined;
        }
      }

      return {
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        sources,
        negotiationAction,
        focusLabel,
        createdAt: new Date(m.created_at).toISOString(),
      };
    });

    return NextResponse.json({
      conversationId: conversation.id,
      contractId: contract.id,
      filename: contract.filename,
      messages: formattedMessages,
    });
  } catch (error: unknown) {
    console.error("Fetch chat history error:", error);
    const message = error instanceof Error ? error.message : "Failed to load chat history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contractId } = await params;
    const body = (await request.json()) as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      message?: string;
      focusContext?: ChatFocusContext;
    };

    // Determine latest user message text
    let userMessageContent = "";
    if (body.message && typeof body.message === "string" && body.message.trim()) {
      userMessageContent = body.message.trim();
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      if (last && last.role === "user") {
        userMessageContent = last.content.trim();
      }
    }

    if (!userMessageContent) {
      return NextResponse.json({ error: "Missing or empty message content." }, { status: 400 });
    }

    // Fetch contract along with clauses and latest review
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            clauses: {
              orderBy: { position: "asc" },
            },
            reviews: {
              where: { status: "complete" },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                findings: {
                  where: { sourceValidated: true },
                  orderBy: [{ isCrossClause: "desc" }, { severity: "asc" }, { createdAt: "asc" }],
                  include: { clause: true },
                },
              },
            },
          },
        },
      },
    });

    if (!contract || (contract.userId && contract.userId !== user.id) || !contract.versions[0]) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    const version = contract.versions[0];
    const review = version.reviews[0];

    // Find or create conversation
    const conversation = await getOrCreateConversation(
      contractId,
      review?.id || null,
      contract.userId || null,
      `Chat on ${contract.filename}`
    );

    // 1. Persist the incoming User Message
    await addChatMessage(
      conversation.id,
      "user",
      userMessageContent,
      body.focusContext ? JSON.stringify(body.focusContext) : null
    );

    // 2. Load recent conversation history (last 10 messages) for multi-turn AI context
    const recentDbMessages = await getRecentChatMessages(conversation.id, 10);

    const aiMessageHistory: Array<{ role: "user" | "assistant"; content: string }> =
      recentDbMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    let userPriorities: string[] = [];
    if (review?.userPriorities) {
      try {
        userPriorities = JSON.parse(review.userPriorities) as string[];
      } catch {
        userPriorities = [];
      }
    }

    let classificationResult: { confirmedContractType?: string } = {};
    if (review?.classificationResult) {
      try {
        classificationResult = JSON.parse(review.classificationResult);
      } catch {
        classificationResult = {};
      }
    }

    const firstFor = (category: string) =>
      review?.findings.find((f: Finding) => f.category === category && !f.isCrossClause);

    const dealSnapshot = [
      {
        label: "Contract Type",
        value: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
      },
      {
        label: "Payment",
        value: firstFor("payment")?.whatItSays || "No explicit payment terms flagged.",
      },
      {
        label: "Deliverables",
        value: firstFor("deliverables")?.whatItSays || "Standard deliverables defined.",
      },
      {
        label: "IP Rights",
        value: firstFor("content_rights")?.whatItSays || "Standard IP license/rights.",
      },
      {
        label: "Exclusivity",
        value: firstFor("exclusivity")?.whatItSays || "No restrictive exclusivity terms found.",
      },
      {
        label: "Termination",
        value: firstFor("termination")?.whatItSays || "Standard termination rules.",
      },
    ];

    // Count total versions for deal context
    const totalVersionsCount = await prisma.contractVersion.count({
      where: { contractId },
    });

    // 3. Ask PactIQ Chat with persistent contract intelligence
    const result = await askPactIQChat(
      aiMessageHistory,
      {
        filename: version.filename || contract.filename,
        contractType: classificationResult.confirmedContractType || contract.contractType || "General Agreement",
        userRole: review?.userRole || "Independent Professional",
        userPriorities,
        versionNumber: version.versionNumber,
        totalVersions: totalVersionsCount,
        comparisonSummary: review?.comparisonResult || undefined,
        dealSnapshot,
        findings: review?.findings || [],
        clauses: version.clauses || [],
      },
      body.focusContext
    );

    // 4. Persist the Assistant Response
    const assistantDbMsg = await addChatMessage(
      conversation.id,
      "assistant",
      result.answer,
      body.focusContext ? JSON.stringify(body.focusContext) : null,
      result.sources && result.sources.length > 0 ? JSON.stringify(result.sources) : null,
      result.negotiationAction ? JSON.stringify(result.negotiationAction) : null
    );

    return NextResponse.json({
      ...result,
      messageId: assistantDbMsg.id,
      conversationId: conversation.id,
      createdAt: new Date(assistantDbMsg.created_at).toISOString(),
    });
  } catch (error: unknown) {
    console.error("Chat route error:", error);
    const message = error instanceof Error ? error.message : "Failed to process chat query.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: contractId } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract || (contract.userId && contract.userId !== user.id)) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }

    await clearChatMessages(contractId);
    return NextResponse.json({ success: true, message: "Chat history cleared." });
  } catch (error: unknown) {
    console.error("Clear chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to clear chat history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
