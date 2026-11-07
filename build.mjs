import * as esbuild from 'esbuild'; import fs from 'fs';
// model.js = model_head.js + model_body.js (ref와 같은 cat 방식; .gitignore 대상)
fs.writeFileSync('src/model.js', fs.readFileSync('src/model_head.js', 'utf8') + '\n' + fs.readFileSync('src/model_body.js', 'utf8'));
const r = await esbuild.build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const tpl = fs.readFileSync('src/template.html', 'utf8');
const frag = tpl.replace('%%SCRIPT%%', () => js);
fs.writeFileSync('page_fragment.html', frag);
// index.html: 오프라인에서 열리는 전체 문서 (커밋 대상)
fs.writeFileSync('index.html', '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + frag.replace('<header>', '</head><body>\n<header>') + '\n</body></html>');
console.log('js', js.length);
