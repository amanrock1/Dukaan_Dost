import { db } from './db';

export async function logAIAction(params: {
  rawInput: string;
  detectedIntent: string;
  extractedEntities: Record<string, unknown>;
  actionTaken: string;
  status: 'success' | 'error' | 'clarification_needed';
  errorMessage?: string;
}) {
  try {
    await db.aILog.create({
      data: {
        rawInput: params.rawInput,
        detectedIntent: params.detectedIntent,
        extractedEntities: JSON.stringify(params.extractedEntities),
        actionTaken: params.actionTaken,
        status: params.status,
        errorMessage: params.errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log AI action:', error);
  }
}

export async function getRecentLogs(limit = 20) {
  return db.aILog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
}
