import { normalizePrivateDataAsync } from './auth.js';
import { getUpdatedAt } from './data.js';
import { validateDataFilePayload } from './validation.js';

const hasExpectedVersion = (value) => value !== undefined && value !== null;

const assertVersionMatch = (label, current, expected) => {
  if (!hasExpectedVersion(expected)) return;
  const currentUpdatedAt = getUpdatedAt(current);
  if (currentUpdatedAt !== expected) {
    const error = new Error(`${label} data changed`);
    error.statusCode = 409;
    error.code = 'VERSION_CONFLICT';
    throw error;
  }
};

export const prepareSaveData = async ({ currentPublic, currentPrivate, publicData, privateData, expected }) => {
  assertVersionMatch('public', currentPublic, expected?.publicUpdatedAt);
  assertVersionMatch('private', currentPrivate, expected?.privateUpdatedAt);
  const validatedPublic = validateDataFilePayload('public.json', publicData);
  const validatedPrivate = await normalizePrivateDataAsync(validateDataFilePayload('private.json', privateData));
  return { publicData: validatedPublic, privateData: validatedPrivate };
};
