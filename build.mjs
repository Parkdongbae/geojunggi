import * as esbuild from 'esbuild'; import fs from 'fs';
// model.js = model_head.js + model_body.js (ref와 같은 cat 방식; .gitignore 대상). 녹로도 같은 방식.
const head = fs.readFileSync('src/model_head.js', 'utf8');
fs.writeFileSync('src/model.js', head + '\n' + fs.readFileSync('src/model_body.js', 'utf8'));
fs.writeFileSync('src/nokro/nk_model.js', head.replace("from './sim.js'", "from './nk_sim.js'") + '\n' + fs.readFileSync('src/nokro/nk_model_body.js', 'utf8'));
async function page(entry, tplPath, out, frag) {
  const r = await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
  const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const f = fs.readFileSync(tplPath, 'utf8').replace('%%SCRIPT%%', () => js);
  if (frag) fs.writeFileSync(frag, f);
  // 오프라인에서 열리는 전체 문서 (커밋 대상)
  fs.writeFileSync(out, '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + f.replace('<header>', '</head><body>\n<header>') + '\n</body></html>');
  console.log(out, js.length);
}
await page('src/app.js', 'src/template.html', 'index.html', 'page_fragment.html');
await page('src/nokro/nk_app.js', 'src/nokro/nk_template.html', 'nokro.html');
