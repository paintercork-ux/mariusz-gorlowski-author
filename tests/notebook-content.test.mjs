import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const data = JSON.parse(readFileSync(new URL('../data/notebook.json', import.meta.url), 'utf8'));

test('the approved selection has three complete chapters, each closed by one original reflection', () => {
  assert.equal(data.entries.length, 63);
  assert.equal(new Set(data.entries.map(entry => entry.id)).size, 63);
  assert.equal(data.entries[0].selectionId, 'H16 R2');
  for (const [category, first, last] of [['human', 'H16 R2', 'A-H01'], ['machine', 'M02', 'A-M01'], ['future', 'F01', 'A-F01']]) {
    const chapter = data.entries.filter(entry => entry.category === category);
    assert.equal(chapter.length, 21);
    assert.equal(chapter[0].selectionId, first);
    assert.equal(chapter.at(-1).selectionId, last);
    assert.equal(chapter.filter(entry => entry.kind === 'reflection').length, 1);
    assert.ok(chapter.slice(0, 20).every(entry => entry.kind === 'quotation'));
  }
  assert.equal(data.entries.find(entry => entry.selectionId === 'F07 R2')?.author.pl, 'Yuval Noah Harari');
  assert.ok(!data.entries.some(entry => ['F07 R1', 'H16 R1'].includes(entry.selectionId)));
});

test('both languages carry usable attribution, publication dates and source links on every card', () => {
  for (const entry of data.entries) {
    assert.match(entry.id, /^[a-z0-9-]+$/u);
    assert.equal(new URL(entry.sourceUrl).protocol, 'https:');
    for (const language of ['pl', 'en']) {
      assert.ok(entry.paragraphs[language].length >= 1, entry.id);
      assert.ok(entry.paragraphs[language].every(value => value.trim() && !value.includes('\\n')), entry.id);
      for (const field of ['author', 'year', 'source', 'context']) assert.ok(entry[field][language].trim(), `${entry.id}: ${field}.${language}`);
    }
    if (entry.kind === 'reflection') assert.equal(entry.author.en, 'Mariusz Gorlowski');
    else assert.notEqual(entry.author.en, 'Mariusz Gorlowski');
    if (entry.kind === 'quotation' && entry.selectionId !== 'F17') assert.ok(entry.translation.pl);
  }
  for (const id of ['H15', 'M06', 'F03', 'F04', 'F16']) assert.equal(data.entries.find(entry => entry.selectionId === id).translation.en, 'Editorial English rendering.');
  assert.equal(data.entries.find(entry => entry.selectionId === 'F17').translation.pl, '');
});

test('the human reflection keeps its two approved paragraphs on one card', () => {
  const entry = data.entries.find(item => item.selectionId === 'A-H01');
  assert.equal(entry.paragraphs.pl.length, 2);
  assert.equal(entry.paragraphs.en.length, 2);
  assert.match(entry.paragraphs.pl[1], /minąć bez pożegnania/u);
});

test('the HTML companions preserve every card and all original attribution without JavaScript', () => {
  for (const [lang, path] of [['en', '../notebook/index.html'], ['pl', '../pl/notebook/index.html']]) {
    const html = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.equal((html.match(/<figure id=/gu) ?? []).length, 63);
    for (const entry of data.entries) assert.ok(html.includes(`id="${entry.id}"`), `${lang}: ${entry.id}`);
    assert.ok(html.includes(data.title[lang]));
  }
});
