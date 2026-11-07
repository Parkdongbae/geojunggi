// 윤곽선: 실제 모서리만 그린다. (ref/edges.js 그대로)
// CSG 결과에는 평면 안쪽에 삼각형 분할선과 T자 접합(한쪽 삼각형에만 속한 변)이 생기므로,
//  ① 두 삼각형이 공유하는 변은 꺾인 각도가 기준보다 클 때만,
//  ② 한 삼각형에만 속한 변은 바깥쪽 바로 옆이 같은 평면의 다른 삼각형으로 덮여 있지 않을 때만 그린다.
import * as THREE from 'three';
export function featureEdges(g,deg=28){
 const P=g.attributes.position.array,cosT=Math.cos(deg*Math.PI/180);
 const vk=i=>Math.round(P[i]*100)+','+Math.round(P[i+1]*100)+','+Math.round(P[i+2]*100);
 const tris=[];const planes=new Map();
 for(let t=0;t<P.length;t+=9){const a=[P[t],P[t+1],P[t+2]],b=[P[t+3],P[t+4],P[t+5]],c=[P[t+6],P[t+7],P[t+8]];
  const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
  let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const L=Math.hypot(...n);if(L<1e-6)continue;
  // 아주 얇은 조각 삼각형(높이 0.2mm 미만)은 법선이 흔들려 면 위에 대각선이 생기므로 윤곽 계산에서 뺀다
  const me=Math.max(Math.hypot(...u),Math.hypot(...v),Math.hypot(c[0]-b[0],c[1]-b[1],c[2]-b[2]));if(L/me<0.2)continue;n=n.map(x=>x/L);
  const d=n[0]*a[0]+n[1]*a[1]+n[2]*a[2];const nq=n.map(x=>Math.round(x*20));const pk=nq.join(',');
  const T={a,b,c,n,d,nq,pk,ks:[vk(t),vk(t+3),vk(t+6)]};tris.push(T);(planes.get(pk)||planes.set(pk,[]).get(pk)).push(T)}
 const inTri=(p,T)=>{const{a,b,c}=T;const v0=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],v1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v2=[p[0]-a[0],p[1]-a[1],p[2]-a[2]];
  const d00=v0[0]*v0[0]+v0[1]*v0[1]+v0[2]*v0[2],d01=v0[0]*v1[0]+v0[1]*v1[1]+v0[2]*v1[2],d02=v0[0]*v2[0]+v0[1]*v2[1]+v0[2]*v2[2],d11=v1[0]*v1[0]+v1[1]*v1[1]+v1[2]*v1[2],d12=v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2];
  const den=d00*d11-d01*d01;if(Math.abs(den)<1e-12)return false;const s=(d11*d02-d01*d12)/den,r=(d00*d12-d01*d02)/den;const e=-1e-4;return s>=e&&r>=e&&s+r<=1-e};
 const edges=new Map();
 for(const T of tris){const V=[T.a,T.b,T.c];for(let e=0;e<3;e++){const k1=T.ks[e],k2=T.ks[(e+1)%3];if(k1===k2)continue;const key=k1<k2?k1+'|'+k2:k2+'|'+k1;
  const m=edges.get(key);if(m)m.t.push(T);else edges.set(key,{p:V[e],q:V[(e+1)%3],o:V[(e+2)%3],t:[T]})}}
 const out=[];
 for(const E of edges.values()){const{p,q}=E;
  if(E.t.length===2){if(E.t[0].n[0]*E.t[1].n[0]+E.t[0].n[1]*E.t[1].n[1]+E.t[0].n[2]*E.t[1].n[2]<cosT)out.push(...p,...q);continue}
  if(E.t.length>2){out.push(...p,...q);continue}
  // 한 삼각형에만 속한 변: 바깥쪽으로 살짝 나간 점이 같은 평면 위 다른 삼각형에 덮이면 평면 속 분할선
  const T=E.t[0],ed=[q[0]-p[0],q[1]-p[1],q[2]-p[2]];let w=[T.n[1]*ed[2]-T.n[2]*ed[1],T.n[2]*ed[0]-T.n[0]*ed[2],T.n[0]*ed[1]-T.n[1]*ed[0]];
  const wl=Math.hypot(...w);if(wl<1e-9)continue;w=w.map(x=>x/wl);const o=E.o;
  if((o[0]-p[0])*w[0]+(o[1]-p[1])*w[1]+(o[2]-p[2])*w[2]>0)w=w.map(x=>-x);
  // 기울어진 면은 반올림 경계에 걸리므로 이웃 법선 칸까지 모아, 법선·거리가 거의 같은 삼각형만 같은 평면으로 본다
  const grp=[];for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const g=planes.get((T.nq[0]+i)+','+(T.nq[1]+j)+','+(T.nq[2]+k));if(g)for(const U of g)if(U.n[0]*T.n[0]+U.n[1]*T.n[1]+U.n[2]*T.n[2]>0.9995&&Math.abs(U.d-T.d)<1.5)grp.push(U)}
  let hidden=false;
  // 변 위 세 점(1/4·1/2·3/4)이 모두 덮여야 지운다
  // CSG가 0.3mm보다 얇은 틈 조각을 남기는 경우가 있어 2mm 바깥도 확인한다 (실제 부재에 2mm보다 얇은 면은 없음)
  hidden=[.25,.5,.75].every(f=>[.3,2].some(o=>{const x=[p[0]+ed[0]*f+w[0]*o,p[1]+ed[1]*f+w[1]*o,p[2]+ed[2]*f+w[2]*o];return grp.some(U=>U!==T&&inTri(x,U))}));
  if(!hidden)out.push(...p,...q)}
 const eg=new THREE.BufferGeometry();eg.setAttribute('position',new THREE.Float32BufferAttribute(out,3));return eg}
