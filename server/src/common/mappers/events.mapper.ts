import type {
  Attachment,
  CareActivity,
  Harvest,
  PlantJournalEntry,
  PlantProblem,
  Task,
} from '@prisma/client';
import type {
  AttachmentDto,
  CareActivityDto,
  HarvestDto,
  JournalEntryDto,
  ProblemDto,
  TaskDto,
} from '@smart-garden/types';
import { dateToIso, decimalToString } from '../utils/pagination.util';

export function toJournalEntryDto(entry: PlantJournalEntry): JournalEntryDto {
  return {
    id: entry.id,
    plantId: entry.plantId,
    authorId: entry.authorId,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    conditionScore: entry.conditionScore,
    height: decimalToString(entry.height),
    heightUnit: entry.heightUnit,
    observedAt: entry.observedAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function toHarvestDto(harvest: Harvest): HarvestDto {
  return {
    id: harvest.id,
    plantId: harvest.plantId,
    harvestedAt: harvest.harvestedAt.toISOString(),
    quantity: harvest.quantity.toString(),
    unit: harvest.unit,
    damagedQuantity: decimalToString(harvest.damagedQuantity),
    quality: harvest.quality,
    notes: harvest.notes,
    quantityGrams: decimalToString(harvest.quantityGrams),
    createdAt: harvest.createdAt.toISOString(),
    updatedAt: harvest.updatedAt.toISOString(),
  };
}

export function toProblemDto(problem: PlantProblem): ProblemDto {
  return {
    id: problem.id,
    plantId: problem.plantId,
    title: problem.title,
    description: problem.description,
    suspectedCause: problem.suspectedCause,
    severity: problem.severity,
    status: problem.status,
    detectedAt: problem.detectedAt.toISOString(),
    resolvedAt: dateToIso(problem.resolvedAt),
    solution: problem.solution,
    createdAt: problem.createdAt.toISOString(),
    updatedAt: problem.updatedAt.toISOString(),
  };
}

export function toCareActivityDto(activity: CareActivity): CareActivityDto {
  return {
    id: activity.id,
    plantId: activity.plantId,
    type: activity.type,
    performedAt: activity.performedAt.toISOString(),
    quantity: decimalToString(activity.quantity),
    unit: activity.unit,
    productName: activity.productName,
    notes: activity.notes,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    userId: task.userId,
    gardenId: task.gardenId,
    zoneId: task.zoneId,
    plantId: task.plantId,
    title: task.title,
    description: task.description,
    dueAt: dateToIso(task.dueAt),
    priority: task.priority,
    status: task.status,
    completedAt: dateToIso(task.completedAt),
    reminderAt: dateToIso(task.reminderAt),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toAttachmentDto(
  attachment: Attachment,
  urls?: { downloadUrl?: string; thumbnailUrl?: string },
): AttachmentDto {
  return {
    id: attachment.id,
    ownerId: attachment.ownerId,
    plantId: attachment.plantId,
    journalEntryId: attachment.journalEntryId,
    problemId: attachment.problemId,
    harvestId: attachment.harvestId,
    storageKey: attachment.storageKey,
    thumbnailKey: attachment.thumbnailKey,
    originalFileName: attachment.originalFileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    width: attachment.width,
    height: attachment.height,
    status: attachment.status,
    createdAt: attachment.createdAt.toISOString(),
    downloadUrl: urls?.downloadUrl,
    thumbnailUrl: urls?.thumbnailUrl,
  };
}
