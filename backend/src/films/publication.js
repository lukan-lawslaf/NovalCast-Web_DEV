'use strict';

const BOOK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const COLLECTION = 'film_editions';

function isBookId(value) {
  return typeof value === 'string' && value.length <= 160 && BOOK_ID.test(value);
}

function httpsUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw Error('A media URL is missing or too long.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw Error('Use an HTTPS media URL without credentials or a fragment.');
  }
  return url.href;
}

function validatePublication(record, bookId) {
  if (!isBookId(bookId) || record?._id !== bookId || record.status !== 'published' ||
      typeof record.title !== 'string' || !record.title.trim() || record.title.length > 240 ||
      !SHA256.test(record.sourceRevision ?? '') || !SHA256.test(record.revision ?? '') ||
      !Number.isSafeInteger(record.bytes) || record.bytes <= 0 ||
      !Number.isFinite(record.durationSeconds) || record.durationSeconds <= 0 ||
      !Array.isArray(record.chapters) || !record.chapters.length || record.chapters.length > 1500) {
    throw Error('The film publication record is invalid.');
  }
  let previous = -1;
  const chapters = record.chapters.map(({ title, startSeconds }, index) => {
    if (typeof title !== 'string' || !title.trim() || title.length > 240 ||
        !Number.isFinite(startSeconds) || startSeconds < 0 || startSeconds >= record.durationSeconds ||
        startSeconds <= previous || (index === 0 && startSeconds !== 0)) {
      throw Error('The film chapter index is invalid.');
    }
    previous = startSeconds;
    return { title, startSeconds };
  });
  const published = {
    ...record, title: record.title.trim(), chapters,
    ...(record.posterUrl ? { posterUrl: httpsUrl(record.posterUrl) } : {}),
  };
  if (record.storage === 'url') {
    published.videoUrl = httpsUrl(record.videoUrl);
    published.captionsUrl = httpsUrl(record.captionsUrl);
  } else if (record.storage === 'drive') {
    const url = new URL(httpsUrl(record.driveUrl));
    if (url.origin !== 'https://drive.google.com' || !/^\/file\/d\/[\w-]+\/view$/.test(url.pathname)) {
      throw Error('Use a Google Drive file viewing link.');
    }
    published.driveUrl = url.href;
  } else if (record.storage !== 'local') {
    throw Error('Choose local film storage or direct HTTPS media URLs.');
  }
  return published;
}

function filmMetadata(record) {
  const { _id: bookId, title, revision, durationSeconds, chapters, posterUrl } = record;
  const path = '/api/films/' + bookId + '/' + revision;
  const metadata = { bookId, title, revision, durationSeconds, chapters, posterUrl };
  if (record.storage === 'drive') return { ...metadata, driveUrl: record.driveUrl };
  return { ...metadata,
    videoUrl: record.storage === 'local' ? path + '/video' : record.videoUrl,
    captionsUrl: record.storage === 'local' ? path + '/captions' : record.captionsUrl };
}

module.exports = { COLLECTION, isBookId, validatePublication, filmMetadata };
