// Some media servers refuse requests without the page's Referer/Origin.
// Requests made by the extension itself (tabId = -1) get the page headers via a session rule.
export async function ensureReferer(mediaUrl, pageUrl) {
  let host, origin;
  try {
    host = new URL(mediaUrl).hostname;
    const page = new URL(pageUrl);
    if (!/^https?:$/.test(page.protocol)) return;
    origin = page.origin;
  } catch {
    return;
  }
  try {
    const rules = await chrome.declarativeNetRequest.getSessionRules();
    const existing = rules.find((r) => r.condition.requestDomains?.[0] === host);
    if (existing && existing.action.requestHeaders?.[0]?.value === origin + '/') return;
    const id = existing ? existing.id : rules.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: existing ? [id] : [],
      addRules: [{
        id,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            { header: 'Referer', operation: 'set', value: origin + '/' },
            { header: 'Origin', operation: 'set', value: origin },
          ],
        },
        condition: {
          requestDomains: [host],
          tabIds: [chrome.tabs.TAB_ID_NONE],
          resourceTypes: ['xmlhttprequest', 'media', 'other'],
        },
      }],
    });
  } catch (e) {
    console.warn('ensureReferer', e);
  }
}
