import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { signingKey } from '@/lib/auth/keys';
import dataStore from '@/lib/db';
import type { Report, ReportAssignment } from '@shared/db/models';

// Manager and staff actions on a report can be undone for a short while, so a
// slip (wrong member, wrong report, wrong score) is easy to take back. The
// action returns a signed undo token holding what it changed and the report's
// state before; POST /api/undo reverts it if the token is still valid, was
// issued to the same user and nobody has touched the report since.

// The toast offers undo for 10 seconds (lib/undo.ts); the server allows a
// little more for a slow network.
const UNDO_TTL_SECONDS = 30;
const AUDIENCE = 'tailan-undo';

type ReportStatus = Report['status'];
type ReturnFields = {
  status: ReportStatus;
  returnReason: string | null;
  returnRequestedBy: string | null;
  revisionItems: string | null;
};

export type UndoAction =
  | { kind: 'assign'; reportId: string; assignmentIds: string[]; notificationIds: string[]; prevStatus: ReportStatus }
  | { kind: 'return-to-sender'; reportId: string; notificationIds: string[]; prev: ReturnFields }
  | { kind: 'return-dismiss'; reportId: string; prev: ReturnFields }
  | { kind: 'return-request'; reportId: string; notificationIds: string[]; prev: ReturnFields }
  | {
      kind: 'signed-scan';
      reportId: string;
      notificationIds: string[];
      prev: { signedScanUrl: string | null; signedScanName: string | null; signedScanUploadedAt: number | null };
    }
  | {
      kind: 'evaluation';
      reportId: string;
      evaluationId: string;
      assignmentId: string;
      // The manager path may create the assignment along with the score.
      assignmentCreated: boolean;
      notificationIds: string[];
      prev: {
        assignmentStatus: ReportAssignment['status'];
        assignmentSubmittedAt: number | null;
        reportStatus: ReportStatus;
        finalScore: number | null;
      };
    };

type UndoPayload = { action: UndoAction; userId: string; reportUpdatedAt: number };

type NotificationInput = { userId: string; reportId: string; title: string; message: string };

function secret() {
  return signingKey('undo');
}

const time = (value: Date | string | number | null | undefined) => (value == null ? null : new Date(value).getTime());

export function returnFields(report: ReturnFields): ReturnFields {
  return {
    status: report.status,
    returnReason: report.returnReason,
    returnRequestedBy: report.returnRequestedBy,
    revisionItems: report.revisionItems ?? null,
  };
}

// createMany returns only a count; undo needs the ids to take them back.
export async function createNotifications(data: NotificationInput[]): Promise<string[]> {
  const ids: string[] = [];
  for (const row of data) ids.push((await dataStore.notification.create({ data: row })).id);
  return ids;
}

// `reportUpdatedAt` is the report's updatedAt after the action's last write.
// Undo tokens are encrypted (AES-256-GCM), not only signed: they carry the
// state to restore (previous status, score, record ids), which the browser
// holding the token must not be able to read.
export function createUndoToken(action: UndoAction, userId: string, reportUpdatedAt: Date | string | number) {
  const payload: UndoPayload = { action, userId, reportUpdatedAt: time(reportUpdatedAt) as number };
  const sealed = { aud: AUDIENCE, exp: Date.now() + UNDO_TTL_SECONDS * 1000, payload };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(sealed), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64url');
}

class UndoExpiredError extends Error {}

function openToken(token: string): unknown {
  const raw = Buffer.from(token, 'base64url');
  // Exactly the encoding we produced: no extra or altered characters.
  if (raw.length < 12 + 16 + 2 || raw.toString('base64url') !== token) throw new Error('malformed token');
  const decipher = createDecipheriv('aes-256-gcm', secret(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(raw.length - 16));
  const text = Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString('utf8');
  const sealed = JSON.parse(text) as { aud?: unknown; exp?: unknown; payload?: unknown };
  if (sealed.aud !== AUDIENCE || typeof sealed.exp !== 'number') throw new Error('bad token');
  if (sealed.exp <= Date.now()) throw new UndoExpiredError();
  return sealed.payload;
}

export class UndoError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

function readToken(token: unknown): UndoPayload {
  if (typeof token !== 'string' || !token) throw new UndoError('Буцаах мэдээлэл олдсонгүй.', 400);
  try {
    const payload = openToken(token) as Partial<UndoPayload> | null;
    if (!payload || typeof payload !== 'object' || !payload.action || !payload.userId) throw new Error('bad payload');
    return payload as UndoPayload;
  } catch (error) {
    if (error instanceof UndoExpiredError) throw new UndoError('Буцаах хугацаа дууссан байна.', 410);
    throw new UndoError('Буцаах мэдээлэл буруу байна.', 400);
  }
}

async function deleteNotifications(ids: string[]) {
  if (ids.length) await dataStore.notification.deleteMany({ where: { id: { in: ids } } });
}

// Reverts the action in the token. Returns the report id for the caller.
export async function undoAction(token: unknown, userId: string): Promise<string> {
  const { action, userId: owner, reportUpdatedAt } = readToken(token);
  if (owner !== userId) throw new UndoError('Энэ үйлдлийг зөвхөн хийсэн хүн буцаана.', 403);

  const report = await dataStore.report.findUnique({ where: { id: action.reportId } });
  if (!report) throw new UndoError('Тайлан олдсонгүй.', 404);
  if (time(report.updatedAt) !== reportUpdatedAt) {
    throw new UndoError('Тайланд дараа нь өөрчлөлт орсон тул буцаах боломжгүй.');
  }

  switch (action.kind) {
    case 'assign': {
      const scored = await dataStore.evaluation.count({ where: { assignmentId: { in: action.assignmentIds } } });
      if (scored > 0) throw new UndoError('Оноогдсон гишүүн үнэлгээ өгсөн тул буцаах боломжгүй.');
      await deleteNotifications(action.notificationIds);
      await dataStore.reportAssignment.deleteMany({ where: { id: { in: action.assignmentIds } } });
      await dataStore.report.update({ where: { id: report.id }, data: { status: action.prevStatus } });
      break;
    }
    case 'return-to-sender':
    case 'return-request':
      await deleteNotifications(action.notificationIds);
      await dataStore.report.update({ where: { id: report.id }, data: action.prev });
      break;
    case 'return-dismiss':
      await dataStore.report.update({ where: { id: report.id }, data: action.prev });
      break;
    case 'signed-scan':
      await deleteNotifications(action.notificationIds);
      await dataStore.report.update({
        where: { id: report.id },
        data: {
          signedScanUrl: action.prev.signedScanUrl,
          signedScanName: action.prev.signedScanName,
          signedScanUploadedAt: action.prev.signedScanUploadedAt == null ? null : new Date(action.prev.signedScanUploadedAt),
        },
      });
      break;
    case 'evaluation': {
      const evaluation = await dataStore.evaluation.findUnique({ where: { id: action.evaluationId } });
      await deleteNotifications(action.notificationIds);
      if (evaluation) {
        await dataStore.evaluationScore.deleteMany({ where: { evaluationId: evaluation.id } });
        await dataStore.evaluation.deleteMany({ where: { id: evaluation.id } });
      }
      if (action.assignmentCreated) {
        await dataStore.reportAssignment.deleteMany({ where: { id: action.assignmentId } });
      } else {
        await dataStore.reportAssignment.update({
          where: { id: action.assignmentId },
          data: {
            status: action.prev.assignmentStatus,
            submittedAt: action.prev.assignmentSubmittedAt == null ? null : new Date(action.prev.assignmentSubmittedAt),
          },
        });
      }
      await dataStore.report.update({
        where: { id: report.id },
        data: { status: action.prev.reportStatus, finalScore: action.prev.finalScore },
      });
      break;
    }
  }
  return report.id;
}
