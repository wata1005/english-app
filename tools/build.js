// src/app.html から index.html を作る。
// アプリが読み上げるフレーズを macOS の say(Samantha)で録音し、base64 で埋め込む。
// 使い方: node tools/build.js   (録音ずみの audio/*.m4a は再利用する)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/app.html'), 'utf8');
const data = src.split('/*DATA-START*/')[1].split('/*DATA-END*/')[0];
const { phrases, clipKey } = new Function(`${data}; return { phrases, clipKey };`)();

const audioDir = path.join(root, 'audio');
fs.mkdirSync(audioDir, { recursive: true });
const tmp = path.join(require('os').tmpdir(), 'eigo-clip.aiff');

const clips = {};
for (const text of phrases()) {
  const key = clipKey(text);
  const out = path.join(audioDir, key + '.m4a');
  if (!fs.existsSync(out)) {
    // 文字は 1 文字ずつ「エー」「ビー」と読ませる
    const spoken = text[0] === '#' ? `[[char LTRL]]${text[1]}[[char NORM]]` : text;
    execFileSync('say', ['-v', 'Samantha', '-r', '150', '-o', tmp, spoken]);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac@22050', '-c', '1', '-b', '40000', tmp, out]);
    console.log('recorded', key);
  }
  clips[key] = fs.readFileSync(out).toString('base64');
}

const body = Object.entries(clips).map(([k, v]) => `${JSON.stringify(k)}:"${v}"`).join(',\n');
// 学習エンジン(src/catalog.js, src/engine.js)を <script> として埋め込む
const MARK = /<!--LEARNING-ENGINE:[^>]*-->/;
if (!MARK.test(src)) throw new Error('src/app.html に LEARNING-ENGINE の目印がありません');
const engineJs = ['catalog.js', 'engine.js', 'parent.js'].map(f => {
  const code = fs.readFileSync(path.join(root, 'src', f), 'utf8');
  if (/<\/script/i.test(code)) throw new Error(`src/${f} に </script> が含まれています`);
  return `<script>\n${code}</script>`;
}).join('\n');
const html = src.replace(MARK, () => engineJs).replace('/*CLIPS*/', () => '\n' + body + '\n');

// 単体のページとして開けるよう doctype をつける
fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html>\n<html lang="ja">\n' + html);
const kb = Math.round(fs.statSync(path.join(root, 'index.html')).size / 1024);
console.log(`index.html: ${Object.keys(clips).length} clips, ${kb} KB`);
