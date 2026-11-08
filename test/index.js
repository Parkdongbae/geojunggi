// Windows의 `node --test test/`는 디렉터리를 `node test/`처럼 직접 실행하므로, 그때의 진입점.
// bare `node --test`는 이 파일을 기본 패턴으로도 찾아내므로,
// 실행 단위가 index.js 자신일 때는 건너뛰어 sim.test.mjs와의 이중 실행을 막는다.
import { pathToFileURL } from 'node:url';
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (!entry.endsWith('/index.js')) { await import('./sim.test.mjs'); await import('./nokro.test.mjs'); }
