// 자격루(自擊漏) 모델 데이터 — 웹앱과 OpenSCAD가 함께 쓰는 단일 원본
// 단위 mm, 절대좌표: x=오른쪽(동), y=안쪽, z=위, z=0 바닥
// 노드: 기본도형 {p:'B'|'C'|'E'|'S'|'P', ..., M}, 차집합 {op:'diff',a,b:[]}, 합집합 {op:'uni',c:[]}

// ---------- 행렬(행 우선 4x4) ----------
const I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
export const mul = (A,B)=>{const R=new Array(16).fill(0);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=A[i*4+k]*B[k*4+j];R[i*4+j]=s}return R};
const T = (x,y,z)=>[1,0,0,x, 0,1,0,y, 0,0,1,z, 0,0,0,1];
const Rz = d=>{const a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[c,-s,0,0, s,c,0,0, 0,0,1,0, 0,0,0,1]};
const Rx = d=>{const a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1]};
const basis=(o,ex,ey,ez)=>[ex[0],ey[0],ez[0],o[0], ex[1],ey[1],ez[1],o[1], ex[2],ey[2],ez[2],o[2], 0,0,0,1];
const sub=(a,b)=>a.map((v,i)=>v-b[i]), add=(a,b)=>a.map((v,i)=>v+b[i]), sc=(a,k)=>a.map(v=>v*k);
const len=a=>Math.hypot(...a), nrm=a=>sc(a,1/len(a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// 선분 p→q 기준 좌표계: 원점=중점, z=방향, x=수평 옆, y=위쪽
function segFrame(p,q){const d=sub(q,p),L=len(d),ez=sc(d,1/L);let ex=cross([0,0,1],ez);if(len(ex)<1e-6)ex=[1,0,0];ex=nrm(ex);const ey=cross(ez,ex);return{M:basis(sc(add(p,q),.5),ex,ey,ez),L}}

// ---------- 기본 도형 ----------
const box=(c,s)=>({p:'B',s,M:T(...c)});
const boxR=(c,s,rz)=>({p:'B',s,M:mul(T(...c),Rz(rz))});
const cyl=(c,d1,d2,h,n=40)=>({p:'C',d1,d2,h,n,M:T(...c)});
const sph=(c,r)=>({p:'S',r,M:T(...c)});
const beam=(p,q,w,h)=>{const f=segFrame(p,q);return{p:'B',s:[w,h,f.L],M:f.M}};
const rod=(p,q,d,n=16)=>{const f=segFrame(p,q);return{p:'C',d1:d,d2:d,h:f.L,n,M:f.M}};
// 평면 다각형(ux,uy 평면)을 두께 h로 돌출, 원점 o 기준 중앙 정렬
const prof=(pts,h,o,ux,uy)=>({p:'E',pts,h,M:basis(o,ux,uy,cross(ux,uy))});
// 선분을 따라 다각형 단면을 돌출 (단면 x=옆, y=위)
const sweep=(pts,p,q)=>{const f=segFrame(p,q);return{p:'E',pts,h:f.L,M:f.M}};
const poly=(V,F)=>({p:'P',V,F,M:I});
const diff=(a,...b)=>({op:'diff',a,b:b.flat().filter(Boolean)});
const uni=(...c)=>({op:'uni',c:c.flat().filter(Boolean)});
// 반공간 절단용 큰 상자: 점 o를 지나고 법선 n 쪽을 모두 잘라냄
function half(o,n,S=14000){n=nrm(n);let ex=cross([0,0,1],n);if(len(ex)<1e-6)ex=[1,0,0];ex=nrm(ex);const ey=cross(n,ex);return{p:'B',s:[S,S,S],M:basis(add(o,sc(n,S/2)),ex,ey,n)}}
// 사각뿔대(위·아래 직사각형) → 다면체
function frustum(c,b,t,h){const[x,y,z]=c,z0=z-h/2,z1=z+h/2;const V=[[x-b[0]/2,y-b[1]/2,z0],[x+b[0]/2,y-b[1]/2,z0],[x+b[0]/2,y+b[1]/2,z0],[x-b[0]/2,y+b[1]/2,z0],[x-t[0]/2,y-t[1]/2,z1],[x+t[0]/2,y-t[1]/2,z1],[x+t[0]/2,y+t[1]/2,z1],[x-t[0]/2,y+t[1]/2,z1]];
 return poly(V,[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])}
// 평면 다각형(반시계) 위·아래 면 높이 함수로 만든 기둥형 다면체
function slab(plan,zb,zt){const n=plan.length,V=[...plan.map(([x,y])=>[x,y,zb(x,y)]),...plan.map(([x,y])=>[x,y,zt(x,y)])];
 const F=[[...Array(n).keys()].reverse(),[...Array(n).keys()].map(i=>i+n)];for(let i=0;i<n;i++){const j=(i+1)%n;F.push([i,j,j+n,i+n])}return poly(V,F)}
const arc=(cx,cy,r,a0,a1,n)=>Array.from({length:n+1},(_,i)=>{const a=(a0+(a1-a0)*i/n)*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]});


// 면 회전: k=0 앞(+y) … 점 [x,y]를 k×90° 회전
const rot=(k,x,y)=>{for(let i=0;i<k;i++)[x,y]=[-y,x];return[x,y]};
const R3=(k,p)=>[...rot(k,p[0],p[1]),p[2]];
const RM=k=>Rz(90*k);
const rotN=(k,node)=>{ // 노드 전체를 z축으로 회전 (k×90°)
 if(k===0)return node;const m=RM(k);
 const f=n=>n.op==='diff'?{op:'diff',a:f(n.a),b:n.b.map(f)}:n.op==='uni'?{op:'uni',c:n.c.map(f)}:n.p==='P'?{...n,V:n.V.map(v=>R3(k,v))}:{...n,M:mul(m,n.M)};
 return f(node)};

// 회전체(물그릇·종·징): 단면 [r,z] 닫힌 다각형을 z축으로 돌림 (OpenSCAD rotate_extrude)
const lat=(c,pts,n=48)=>({p:'L',pts,n,M:T(...c)});
// 그릇 단면: 바깥선(아래→위) + 벽 두께 + 바닥 두께 → 속 빈 닫힌 단면
function jarPts(outer,wall,bot){const rAt=z=>{for(let i=1;i<outer.length;i++){const[a,b]=[outer[i-1],outer[i]];if(z>=a[1]&&z<=b[1]&&b[1]>a[1])return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1])}return outer[outer.length-1][0]};
 const inn=outer.filter(p=>p[1]>bot+wall).map(([r,z])=>[Math.max(1,Math.min(r,rAt(Math.max(bot,z-wall)),rAt(Math.min(outer[outer.length-1][1],z+wall)))-wall),z]).reverse();
 return[[0,0],...outer,...inn,[Math.max(1,rAt(bot)-wall),bot],[0,bot]]}
// 노드 전체에 행렬 M을 왼쪽에서 곱함 (평행이동·회전)
const tpt=(M,p)=>[0,1,2].map(i=>M[i*4]*p[0]+M[i*4+1]*p[1]+M[i*4+2]*p[2]+M[i*4+3]);
function xform(node,M){const f=n=>n.op==='diff'?{op:'diff',a:f(n.a),b:n.b.map(f)}:n.op==='uni'?{op:'uni',c:n.c.map(f)}:n.p==='P'?{...n,V:n.V.map(v=>tpt(M,v))}:{...n,M:mul(M,n.M)};return f(node)}
const Ry=d=>{const a=d*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1]};
export {T,Rz,Rx,Ry};

