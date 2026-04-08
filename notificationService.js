const VALID_NOTIFICATION_TYPES = new Set(['info', 'success', 'warning', 'danger']);
const DASHBOARD_TABS = new Set(['dashboard', 'notifications', 'bookings', 'kyc', 'profile', 'partner']);

function sanitizeText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeNotificationType(type) {
  const trimmedType = sanitizeText(type);
  return VALID_NOTIFICATION_TYPES.has(trimmedType) ? trimmedType : 'info';
}

function normalizeDashboardTab(tab) {
  const trimmedTab = sanitizeText(tab);
  return DASHBOARD_TABS.has(trimmedTab) ? trimmedTab : 'dashboard';
}

function getDashboardLink(tab = 'dashboard') {
  const normalizedTab = normalizeDashboardTab(tab);
  return normalizedTab === 'dashboard'
    ? '/user/dashboard'
    : `/user/dashboard?tab=${normalizedTab}`;
}

async function createNotification(db, payload) {
  const userId = Number(payload.userId);
  const title = sanitizeText(payload.title);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('A valid userId is required to create a notification.');
  }

  if (!title) {
    throw new Error('A notification title is required.');
  }

  const message = sanitizeText(payload.message);
  const type = normalizeNotificationType(payload.type);
  const linkUrl = sanitizeText(payload.linkUrl);
  const sourceType = sanitizeText(payload.sourceType);
  const sourceId = payload.sourceId === undefined || payload.sourceId === null
    ? null
    : Number(payload.sourceId);

  return db.query(
    `INSERT INTO notifications (user_id, title, message, type, link_url, source_type, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title.slice(0, 255),
      message,
      type,
      linkUrl ? linkUrl.slice(0, 255) : null,
      sourceType ? sourceType.slice(0, 50) : null,
      Number.isInteger(sourceId) ? sourceId : null
    ]
  );
}

module.exports = {
  createNotification,
  getDashboardLink,
  normalizeDashboardTab,
  normalizeNotificationType
};
