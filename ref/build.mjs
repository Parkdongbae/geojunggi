import * as esbuild from 'esbuild';import fs from 'fs';
const r=await esbuild.build({entryPoints:['app.js'],bundle:true,minify:true,format:'iife',write:false,target:'es2020'});
const js=r.outputFiles[0].text.replace(/<\/script/g,'<\\/script');
const tpl=fs.readFileSync('template.html','utf8');
const frag=tpl.replace('%%SCRIPT%%',()=>js);
fs.writeFileSync('page_fragment.html',frag);
fs.writeFileSync('page_full.html','<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+frag.replace('<header>','</head><body>\n<header>')+'\n</body></html>');
console.log('js',js.length);
