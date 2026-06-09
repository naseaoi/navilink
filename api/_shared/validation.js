const MAX_CATEGORIES = 100;
const MAX_CARDS = 1000;
const MAX_ID_LENGTH = 80;
const MAX_TITLE_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 240;
const MAX_URL_LENGTH = 1000;
const MAX_FOOTER_LENGTH = 240;
const MAX_USERNAME_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const SCRYPT_PATTERN = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i;

const fail = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
};

const asObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
};

const asArray = (value, label, max) => {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (value.length > max) fail(`${label} is too large`);
  return value;
};

const asString = (value, label, max, required = true) => {
  if (value == null) {
    if (!required) return '';
    fail(`${label} is required`);
  }
  if (typeof value !== 'string') fail(`${label} must be a string`);
  const trimmed = value.trim();
  if (required && !trimmed) fail(`${label} is required`);
  if (trimmed.length > max) fail(`${label} is too long`);
  return trimmed;
};

const asOrder = (value, label) => {
  if (!Number.isFinite(value)) fail(`${label} must be a number`);
  return Math.trunc(value);
};

const asHttpUrl = (value, label, required = true) => {
  const text = asString(value, label, MAX_URL_LENGTH, required);
  if (!text) return '';
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    fail(`${label} must be a valid URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) fail(`${label} must use http or https`);
  return parsed.toString();
};

const validateSettings = (settings) => {
  const input = asObject(settings, 'settings');
  const icon = asString(input.icon ?? '', 'settings.icon', MAX_URL_LENGTH, false);
  let normalizedIcon = icon;
  if (/^https?:\/\//i.test(icon)) normalizedIcon = asHttpUrl(icon, 'settings.icon', false);
  return {
    title: asString(input.title, 'settings.title', MAX_TITLE_LENGTH),
    icon: normalizedIcon,
    footerText: asString(input.footerText ?? '', 'settings.footerText', MAX_FOOTER_LENGTH, false)
  };
};

const validateCategory = (category, index) => {
  const input = asObject(category, `categories.${index}`);
  return {
    id: asString(input.id, `categories.${index}.id`, MAX_ID_LENGTH),
    name: asString(input.name, `categories.${index}.name`, MAX_TITLE_LENGTH),
    order: asOrder(input.order, `categories.${index}.order`)
  };
};

const validateCard = (card, index) => {
  const input = asObject(card, `cards.${index}`);
  return {
    id: asString(input.id, `cards.${index}.id`, MAX_ID_LENGTH),
    categoryId: asString(input.categoryId, `cards.${index}.categoryId`, MAX_ID_LENGTH),
    title: asString(input.title, `cards.${index}.title`, MAX_TITLE_LENGTH),
    description: asString(input.description ?? '', `cards.${index}.description`, MAX_DESCRIPTION_LENGTH, false),
    url: asHttpUrl(input.url, `cards.${index}.url`),
    icon: asHttpUrl(input.icon ?? '', `cards.${index}.icon`, false),
    order: asOrder(input.order, `cards.${index}.order`)
  };
};

export const validatePublicData = (data) => {
  const input = asObject(data, 'publicData');
  return {
    settings: validateSettings(input.settings),
    categories: asArray(input.categories, 'categories', MAX_CATEGORIES).map(validateCategory),
    cards: asArray(input.cards, 'cards', MAX_CARDS).map(validateCard),
    _meta: input._meta && typeof input._meta === 'object' ? input._meta : undefined
  };
};

export const validatePrivateData = (data) => {
  const input = asObject(data, 'privateData');
  const admin = asObject(input.admin, 'admin');
  const passwordHash = asString(admin.passwordHash, 'admin.passwordHash', Math.max(MAX_PASSWORD_LENGTH, 256));
  if (passwordHash.startsWith('scrypt$')) {
    if (!SCRYPT_PATTERN.test(passwordHash)) fail('admin.passwordHash is invalid');
  } else {
    if (passwordHash.length < MIN_PASSWORD_LENGTH) fail('password must be at least 8 characters');
    if (passwordHash.length > MAX_PASSWORD_LENGTH) fail('password is too long');
  }
  return {
    admin: {
      username: asString(admin.username, 'admin.username', MAX_USERNAME_LENGTH),
      passwordHash
    },
    _meta: input._meta && typeof input._meta === 'object' ? input._meta : undefined
  };
};

export const validateDataFilePayload = (fileName, data) => {
  if (fileName === 'public.json') return validatePublicData(data);
  if (fileName === 'private.json') return validatePrivateData(data);
  fail('fileName is invalid');
};

export const validateLoginPayload = (body = {}) => ({
  username: asString(body.username, 'username', MAX_USERNAME_LENGTH),
  password: asString(body.password, 'password', MAX_PASSWORD_LENGTH),
  remember: !!body.remember
});
