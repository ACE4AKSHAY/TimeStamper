#!/usr/bin/env node

/**
 * Dependency-free link checker for research Markdown.
 *
 * Usage:
 *   node research/scripts/link-checker.mjs docs research
 *
 * It performs GET/HEAD requests only, follows redirects through fetch, and
 * prints JSON. It never uploads file contents; only the URL is requested.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const roots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['docs', 'research'];
const timeoutMs = 15000;
const urlPattern = /https?:\/\/[^\s)\]>"']+/g;

async function markdownFiles(root) {
  const absolute = resolve(root);
  const info = await stat(absolute);
  if (info.isFile()) return absolute.endsWith('.md') ? [absolute] : [];
  const entries = await readdir(absolute, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => markdownFiles(join(absolute, entry.name))),
  );
  return nested.flat();
}

function cleanUrl(value) {
  return value.replace(/[.,;:!?]+$/u, '');
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'TimeStamper-research-link-checker/1.0' },
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'TimeStamper-research-link-checker/1.0' },
      });
    }
    const status = response.status >= 500 ? 'blocked' : response.status >= 400 ? 'dead' : 'OK';
    return { url, status, httpStatus: response.status, finalUrl: response.url };
  } catch (error) {
    return {
      url,
      status: error?.name === 'AbortError' ? 'blocked' : 'blocked',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

const files = (await Promise.all(roots.map(markdownFiles))).flat();
const urls = new Set();
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const match of content.match(urlPattern) ?? []) urls.add(cleanUrl(match));
}

const results = [];
for (const url of [...urls].sort()) results.push(await checkUrl(url));
process.stdout.write(
  `${JSON.stringify({ checkedAt: new Date().toISOString(), files, count: results.length, results }, null, 2)}\n`,
);
