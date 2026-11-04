/*
 * "ציד צבעים" photo backend: a Google Apps Script web app that saves the photos groups take into Drive.
 * Setup steps are in README.md, section "ציד צבעים: שמירת התמונות ב-Google Drive".
 *
 * Access: the drive.file scope only (see appsscript.json), so this script can see and change ONLY the
 * folders and files it created itself, nothing else in the Drive. That's why setup() creates the color
 * folders, and you then move them into the shared folder by hand.
 *
 * Photo details (color, group, which phone, delete key) are kept in Script Properties, not read back
 * from Drive, so listing is a single fast read. The limit is ~500KB, about 2,500 photos.
 *
 * Requests from the site:
 *   GET  ?color=red&before=<ms>&size=12&device=<id>&callback=fn   other groups' photos, newest first
 *   POST {action:'upload', color, group, device, id, token, image}  image is a JPEG data URL
 *   POST {action:'delete', fileId, token}                           moves the photo to the Drive trash
 */

// Folder names in Drive, by the color keys used in data/color-hunt-data.js
const COLORS = {
  red: 'Red', orange: 'Orange', yellow: 'Yellow', green: 'Green', cyan: 'Cyan', blue: 'Blue',
  purple: 'Purple', pink: 'Pink', brown: 'Brown', white: 'White', gray: 'Gray', black: 'Black'
};
// Colors that get a folder in setup(); keep in line with data/color-hunt-data.js
const IN_GAME = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'brown'];
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PAGE = 30;
const API = 'https://www.googleapis.com/drive/v3/files';

const props = PropertiesService.getScriptProperties();

// Run once from the editor (choose "setup" and press Run). Creates a folder per color and logs links.
// Then, in Drive, move those folders into the shared folder. Safe to run again: it only adds missing ones.
function setup() {
  IN_GAME.forEach(function (color) {
    let id = props.getProperty('folder:' + color);
    if (!id) {
      id = drive('post', API + '?fields=id', { name: COLORS[color], mimeType: 'application/vnd.google-apps.folder' }).id;
      props.setProperty('folder:' + color, id);
    }
    Logger.log(COLORS[color] + ': https://drive.google.com/drive/folders/' + id);
  });
}

// Run from the editor after deleting photos by hand in Drive: drops photos that are in the trash
// or gone, so the site stops listing them. Logs how many it removed.
function cleanup() {
  let removed = 0;
  photos().forEach(function (m) {
    // {} when the file is gone for good (404), {trashed: true} when it is in the trash
    const f = request('get', API + '/' + m.f + '?fields=name,trashed', null, null, true);
    const gone = f.trashed !== false;
    Logger.log((gone ? 'removed  ' : 'kept     ') + COLORS[m.c] + ' | ' + m.g + ' | ' + (f.name || '(deleted)') + ' | ' + m.f);
    if (gone) { props.deleteProperty('p:' + m.f); removed++; }
  });
  Logger.log('Removed ' + removed + ' photo(s) from the list');
}

// Deletes one photo by its Drive file id (the part after /d/ in its link, or from cleanup's log):
// paste the id below, choose "removeOne" and press Run. It goes to the Drive trash and off the site.
function removeOne() {
  const FILE_ID = '';
  FILE_ID || fail('paste the file id into FILE_ID first');
  drive('patch', API + '/' + FILE_ID, { trashed: true }, true);
  props.deleteProperty('p:' + FILE_ID);
  Logger.log('Deleted ' + FILE_ID);
}

function doGet(e) {
  const p = e.parameter;
  let out;
  try { out = list(p.color, Number(p.before) || Infinity, Math.min(Number(p.size) || 12, MAX_PAGE), p.device || ''); }
  catch (err) { out = { status: 'error', error: String(err.message || err) }; }
  const json = JSON.stringify(out);
  // JSONP, like the decisions page: works from GitHub Pages and from file:// with no CORS setup
  if (p.callback && /^[\w$.]+$/.test(p.callback))
    return ContentService.createTextOutput(p.callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let out;
  try {
    const b = JSON.parse(e.postData.contents);
    out = b.action === 'delete' ? remove(b) : b.action === 'upload' ? upload(b) : fail('unknown action');
  } catch (err) { out = { status: 'error', error: String(err.message || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function fail(msg) { throw new Error(msg); }
function text(v, max) { return typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : fail('bad field'); }
function hash(t) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t)); }

// Every saved photo: key 'p:<Drive file id>', value {c: color, g: group, d: device, i: id on the phone, h: hash of its delete key, t: ms}
function photos() {
  const all = props.getProperties(), out = [];
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('p:') === 0) { const m = JSON.parse(all[k]); m.f = k.slice(2); out.push(m); }
  });
  return out;
}

function list(color, before, size, device) {
  COLORS[color] || fail('unknown color');
  const mine = photos().filter(m => m.c === color && m.d !== device && m.t < before).sort((a, b) => b.t - a.t);
  return {
    status: 'ok',
    photos: mine.slice(0, size).map(m => ({ id: m.f, group: m.g, time: m.t })),
    more: mine.length > size
  };
}

function upload(b) {
  const folder = props.getProperty('folder:' + b.color) || fail('no folder for this color, run setup()');
  const group = text(b.group, 60), device = text(b.device, 64), id = text(b.id, 64), token = text(b.token, 64);
  token.length >= 16 || fail('bad token');
  // A phone retries when it didn't get an answer, so the same photo may arrive twice
  const dup = photos().filter(m => m.d === device && m.i === id)[0];
  if (dup) return { status: 'ok', fileId: dup.f };
  const prefix = 'data:image/jpeg;base64,';
  typeof b.image === 'string' && b.image.indexOf(prefix) === 0 || fail('not a jpeg');
  const bytes = Utilities.base64Decode(b.image.slice(prefix.length));
  bytes.length <= MAX_BYTES || fail('too big');

  const now = new Date();
  const meta = {
    name: group + ' ' + Utilities.formatDate(now, 'Asia/Jerusalem', 'yyyy-MM-dd HH-mm-ss') + '.jpg',
    parents: [folder], description: 'קבוצה: ' + group, mimeType: 'image/jpeg'
  };
  const boundary = 'colorhunt' + now.getTime();
  const body = Utilities.newBlob('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(meta) + '\r\n--' + boundary + '\r\nContent-Type: image/jpeg\r\n\r\n').getBytes()
    .concat(bytes, Utilities.newBlob('\r\n--' + boundary + '--').getBytes());
  const file = request('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    body, 'multipart/related; boundary=' + boundary);
  // Viewable by link, so other groups' phones can show it
  drive('post', API + '/' + file.id + '/permissions', { role: 'reader', type: 'anyone' });
  props.setProperty('p:' + file.id, JSON.stringify({ c: b.color, g: group, d: device, i: id, h: hash(token), t: now.getTime() }));
  return { status: 'ok', fileId: file.id };
}

// Only the phone that uploaded a photo holds its delete key
function remove(b) {
  const fileId = text(b.fileId, 100), raw = props.getProperty('p:' + fileId);
  if (!raw) return { status: 'ok' };  // already deleted
  JSON.parse(raw).h === hash(String(b.token)) || fail('forbidden');
  // To the trash, not gone for good: it can still be restored from Drive for 30 days
  drive('patch', API + '/' + fileId, { trashed: true }, true);
  props.deleteProperty('p:' + fileId);
  return { status: 'ok' };
}

function drive(method, url, json, allowMissing) {
  return request(method, url, JSON.stringify(json), 'application/json', allowMissing);
}

function request(method, url, payload, contentType, allowMissing) {
  const opts = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } };
  if (payload) { opts.payload = payload; opts.contentType = contentType; }
  const r = UrlFetchApp.fetch(url, opts);
  const code = r.getResponseCode();
  if (allowMissing && code === 404) return {};  // e.g. the photo was deleted by hand in Drive
  if (code >= 300) fail('drive ' + code + ': ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText() || '{}');
}
