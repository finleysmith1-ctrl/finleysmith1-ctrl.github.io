/* Unwebbed — the town of lights.
   One three.js scene behind the whole page. Every point is a light in a town at
   night; the businesses with no website are dark until the search finds them and
   lights them green. The scroll flies you down into the streets and back out.
   Loads after vendor/three.min.js (r128). */
(function(){
  'use strict';
  var cv=document.getElementById('townc'); if(!cv||!window.THREE) return;
  var html=document.documentElement;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var renderer=null;
  try{ renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:false,powerPreference:'high-performance'}); }catch(e){ renderer=null; }
  if(!renderer){ html.classList.add('no3d'); return; }
  html.classList.add('has3d'); if(reduced) html.classList.add('still');
  var gl=renderer.getContext(); var psRange=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)||[1,64];
  var BG=0x0E100F; renderer.setClearColor(BG,1);
  var dpr=Math.min(devicePixelRatio||1,2); renderer.setPixelRatio(dpr);
  var W=innerWidth,H=innerHeight; renderer.setSize(W,H,false);
  var scene=new THREE.Scene();
  var cam=new THREE.PerspectiveCamera(42,W/H,0.4,420);

  /* ---------- seeded random, so the town is the same on every visit ---------- */
  function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  var R=mulberry(20260905);
  function rnd(a,b){return a+(b-a)*R()}

  /* ---------- the town ---------- */
  var C={sodium:[1.0,0.54,0.18],sodium2:[1.0,0.66,0.30],led:[0.72,0.84,1.0],warm:[1.0,0.78,0.50],warm2:[1.0,0.90,0.72],cool:[0.76,0.88,1.0],red:[1.0,0.18,0.12],green:[0.24,0.85,0.54]};
  function jit(c,k){return [c[0]*(1+rnd(-k,k)),c[1]*(1+rnd(-k,k)),c[2]*(1+rnd(-k,k))]}
  var pts=[]; /* {x,y,z,c,s,k}  k: 0 street lamp · 1 window · 2 business (green when found) · 3 landmark */
  function hill(x,z){var t=Math.max(0,Math.min(1,(x-24)/34));t=t*t*(3-2*t);return t*11*(0.75+0.25*Math.sin(z*0.09+1.3))}
  function riverD(x,z){var c=21+5*Math.sin(x*0.055+0.6)+2*Math.sin(x*0.17);return Math.abs(z-c)}
  function inPark(x,z){var dx=(x-9)/8,dz=(z+9)/5.5;return dx*dx+dz*dz<1}
  function ok(x,z){return riverD(x,z)>2.6&&!inPark(x,z)&&x*x+z*z<62*62}
  function add(x,z,y,c,s,k){pts.push({x:x,y:y+hill(x,z),z:z,c:c,s:s,k:k})}
  function line(x0,z0,x1,z1,gap,y,c,s){var d=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(d/gap));for(var i=0;i<=n;i++){var t=i/n;add(x0+(x1-x0)*t,z0+(z1-z0)*t,y,jit(c,0.05),s,0)}}

  function district(cx,cz,rot,sp,radius,o){
    var cs=Math.cos(rot),sn=Math.sin(rot);
    function toW(u,v){return [cx+u*cs-v*sn,cz+u*sn+v*cs]}
    var n=Math.ceil(radius/sp);
    for(var pass=0;pass<2;pass++) for(var i=-n;i<=n;i++){
      var a=i*sp; if(R()<o.skip) continue;
      for(var b=-radius;b<=radius;b+=o.gap){
        if(a*a+b*b>radius*radius) continue;
        var w=pass?toW(b+rnd(-.1,.1),a):toW(a,b+rnd(-.1,.1)); if(!ok(w[0],w[1])) continue;
        if(R()>o.dens(w[0],w[1])) continue;
        add(w[0],w[1],0.55,jit(R()<o.led?C.led:(R()<.5?C.sodium:C.sodium2),0.08),rnd(0.5,0.74)*o.sl,0);
      }
    }
    for(var bi=-n;bi<n;bi++) for(var bj=-n;bj<n;bj++){
      var u0=bi*sp,v0=bj*sp,cu=u0+sp/2,cv2=v0+sp/2; if(cu*cu+cv2*cv2>radius*radius) continue;
      var wc=toW(cu,cv2); if(!ok(wc[0],wc[1])) continue; var d=o.dens(wc[0],wc[1]); if(R()>d) continue;
      var nw=Math.round(o.win*(0.5+R()));
      for(var k=0;k<nw;k++){
        var w2=toW(u0+rnd(0.6,sp-0.6),v0+rnd(0.6,sp-0.6)); if(!ok(w2[0],w2[1])) continue;
        var floors=1+Math.floor(R()*o.floors);
        for(var f=0;f<floors;f++){ if(R()<0.6) add(w2[0]+rnd(-.15,.15),w2[1]+rnd(-.15,.15),0.5+f*0.9,jit(R()<o.cool?C.cool:(R()<.5?C.warm:C.warm2),0.06),rnd(0.26,0.48),1) }
      }
      var nb=o.biz?Math.round(o.biz*(0.5+R())):0;
      for(var q=0;q<nb;q++){
        var side=Math.floor(R()*4),uu,vv;
        if(side<2){uu=u0+(side?sp-0.35:0.35);vv=v0+rnd(0.5,sp-0.5)} else {uu=u0+rnd(0.5,sp-0.5);vv=v0+(side===3?sp-0.35:0.35)}
        var w3=toW(uu,vv); if(!ok(w3[0],w3[1])) continue; add(w3[0],w3[1],0.5,C.green,0.72,2);
      }
    }
  }
  /* downtown: tight grid, LED lamps, several floors, many shopfronts */
  district(0,0,0.32,4.2,15,{gap:1.0,skip:0.05,dens:function(){return 1},led:0.5,sl:1.0,win:13,floors:4,cool:0.25,biz:3});
  /* the rest of town: an older, wider grid at a different angle, thinning out with distance and climbing the hill to the east */
  district(-4,-6,-0.18,6,58,{gap:1.1,skip:0.12,dens:function(x,z){var d2=x*x+z*z;if(d2<15.5*15.5)return 0;return Math.max(0.08,Math.exp(-d2/(42*42)))},led:0.12,sl:0.85,win:9,floors:1.7,cool:0.12,biz:1.6});
  /* highway with two carriageways and an interchange */
  for(var z=-70;z<=70;z+=0.75){var hx=-26+9*Math.sin(z*0.045+0.4);if(hx*hx+z*z>66*66)continue;for(var sd=-1;sd<=1;sd+=2){if(riverD(hx,z)<2.6)continue;add(hx+sd*0.7,z+rnd(-.05,.05),0.9,jit(C.sodium,0.05),rnd(0.55,0.75),0)}}
  var ix=-26+9*Math.sin(8*0.045+0.4); for(var an=0;an<Math.PI*2;an+=0.11){add(ix+4.5*Math.cos(an),8+4.5*Math.sin(an),1.2,jit(C.sodium,0.05),0.6,0)}
  /* two bridges over the river */
  (function(){var rz=function(x){return 21+5*Math.sin(x*0.055+0.6)+2*Math.sin(x*0.17)};line(3,rz(3)-3,3,rz(3)+3,0.7,0.8,C.led,0.6);var bx=-26+9*Math.sin(rz(-26)*0.045+0.4);line(bx-0.7,rz(bx)-3,bx-0.7,rz(bx)+3,0.7,0.9,C.sodium,0.65);line(bx+0.7,rz(bx)-3,bx+0.7,rz(bx)+3,0.7,0.9,C.sodium,0.65)})();
  /* park paths, a stadium, three towers, farms beyond the edge */
  for(var pa=0;pa<Math.PI*2;pa+=0.34){add(9+7.4*Math.cos(pa),-9+5*Math.sin(pa),0.4,jit(C.sodium2,0.05),0.42,0)}
  for(var sx=0;sx<7;sx++)for(var sz=0;sz<4;sz++){add(-11+sx*0.75,-30+sz*0.75,0.4,jit(C.cool,0.04),0.42,1)}
  [[-11.6,-30.6],[-5.9,-30.6],[-11.6,-27.1],[-5.9,-27.1]].forEach(function(m){add(m[0],m[1],6.5,C.cool,2.1,3)});
  [[2,-1,9],[-3,3,7.5],[5,4,6.5]].forEach(function(t){for(var y=1.2;y<t[2];y+=0.9){for(var w=0;w<3;w++){if(R()<0.7)add(t[0]+rnd(-.45,.45),t[1]+rnd(-.45,.45),y,jit(R()<.4?C.cool:C.warm2,0.05),0.34,1)}}add(t[0],t[1],t[2]+0.4,C.red,0.62,3)});
  for(var fz=0;fz<260;fz++){var fa=R()*Math.PI*2,fr=60+R()*44,fx=Math.cos(fa)*fr,fzz=Math.sin(fa)*fr;if(riverD(fx,fzz)<2.6)continue;add(fx,fzz,0.4,jit(C.warm,0.1),rnd(0.35,0.6),1)}

  /* the shopfront the story follows: a business a few blocks east of the centre */
  var N=pts.length, S=-1, sd=1e9;
  for(var i=0;i<N;i++){var p=pts[i];if(p.k!==2)continue;var dd=(p.x-7)*(p.x-7)+(p.z-3)*(p.z-3);if(dd<sd){sd=dd;S=i}}
  var SP=new THREE.Vector3(pts[S].x,pts[S].y,pts[S].z);
  pts[S].s=1.5;

  /* ---------- buffers ---------- */
  var pos=new Float32Array(N*3),col=new Float32Array(N*3),siz=new Float32Array(N),seed=new Float32Array(N),kind=new Float32Array(N);
  var cand=[]; /* indices of every shopfront that could be lit */
  for(var j=0;j<N;j++){var q=pts[j];pos[j*3]=q.x;pos[j*3+1]=q.y;pos[j*3+2]=q.z;col[j*3]=q.c[0];col[j*3+1]=q.c[1];col[j*3+2]=q.c[2];siz[j]=q.s;seed[j]=R();kind[j]=q.k===2?4:q.k;if(q.k===2)cand.push(j)}
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('aColor',new THREE.BufferAttribute(col,3));
  geo.setAttribute('aSize',new THREE.BufferAttribute(siz,1));
  geo.setAttribute('aSeed',new THREE.BufferAttribute(seed,1));
  var kindAttr=new THREE.BufferAttribute(kind,1); kindAttr.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aKind',kindAttr);
  geo.computeBoundingSphere();

  var U={uTime:{value:0},uScale:{value:1},uPR:{value:dpr},uFocus:{value:100},uDof:{value:40},uSweep:{value:-999},uFlip:{value:0},uTwinkle:{value:reduced?0:1},uMaxPS:{value:Math.min(psRange[1],110*dpr)},uGain:{value:1},uFog:{value:0.0026}};
  var mat=new THREE.ShaderMaterial({uniforms:U,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
    vertexShader:[
      'attribute vec3 aColor;attribute float aSize;attribute float aSeed;attribute float aKind;',
      'uniform float uTime,uScale,uPR,uFocus,uDof,uSweep,uFlip,uTwinkle,uMaxPS,uGain,uFog;',
      'varying vec3 vColor;varying float vA;varying float vBlur;varying float vFlare;',
      'void main(){',
      ' vec4 mv=modelViewMatrix*vec4(position,1.0);float depth=max(0.05,-mv.z);',
      ' float on=1.0;vec3 c=aColor;float sz=aSize;',
      ' if(aKind>3.5){on=0.0;}',
      ' else if(aKind>1.5&&aKind<2.5){',
      '  float f=smoothstep(position.x-0.6,position.x+1.8,uSweep);',
      '  float since=max(0.0,uSweep-position.x);float flash=exp(-since*0.45)*1.3;',
      '  float flip=smoothstep(aSeed*0.85,aSeed*0.85+0.15,uFlip);',
      '  c=mix(vec3(0.24,0.85,0.54)*(1.0+flash),vec3(1.0,0.86,0.62),flip);',
      '  on=f;sz*=1.0+0.4*flash*(1.0-flip);',
      ' }',
      ' float tw=1.0-uTwinkle*0.22*(0.5+0.5*sin(uTime*(0.5+aSeed*1.3)+aSeed*60.0));',
      ' float coc=clamp(abs(depth-uFocus)/uDof,0.0,1.0);coc=coc*coc*(3.0-2.0*coc);',
      ' float base=sz*uScale/depth;',
      ' float grow=1.0+coc*3.0;float ps=base*grow;',
      ' float a=on*tw*uGain*exp(-depth*uFog);',
      ' if(base<1.6){a*=base*base/2.56;}',
      ' float cap=uMaxPS/uPR;if(ps>cap){a*=cap*cap/(ps*ps);ps=cap;}',
      ' a/=1.0+(grow*grow-1.0)*0.15;',
      ' ps=max(ps,1.6);',
      ' gl_PointSize=ps*uPR;',
      ' vA=a;vBlur=coc;vFlare=smoothstep(0.75,1.5,sz)*(1.0-coc)*step(5.0,base);',
      ' vColor=c;gl_Position=projectionMatrix*mv;',
      '}'].join('\n'),
    fragmentShader:[
      'precision highp float;varying vec3 vColor;varying float vA;varying float vBlur;varying float vFlare;',
      'void main(){',
      ' vec2 p=gl_PointCoord*2.0-1.0;float r2=dot(p,p);if(r2>1.0)discard;float r=sqrt(r2);',
      ' float core=exp(-r2*9.0);float halo=exp(-r2*2.4)*0.28;',
      ' float disc=(1.0-smoothstep(0.72,1.0,r))*(0.62+0.38*smoothstep(0.25,0.92,r));',
      ' float a=mix(core+halo,disc,vBlur);',
      ' float fl=(exp(-abs(p.x)*7.0)*exp(-abs(p.y)*30.0)+exp(-abs(p.y)*7.0)*exp(-abs(p.x)*30.0))*vFlare*0.55;',
      ' a=(a+fl)*vA;',
      ' vec3 c=mix(vec3(dot(vColor,vec3(0.333))),vColor,1.0+0.6*vBlur);',
      ' gl_FragColor=vec4(max(c,0.0)*a,1.0);',
      '}'].join('\n')});
  var cloud=new THREE.Points(geo,mat); cloud.frustumCulled=false; scene.add(cloud);

  var glow=null;
  /* the soft glow a town throws up into the night, brightest over the centre */
  (function(){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d');var gr=g.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(255,170,90,0.55)');gr.addColorStop(0.35,'rgba(255,150,80,0.22)');gr.addColorStop(1,'rgba(255,140,70,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);var t=new THREE.CanvasTexture(c);
    var m=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshBasicMaterial({map:t,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,opacity:0.62}));m.rotation.x=-Math.PI/2;m.position.set(0,-0.3,0);scene.add(m);glow=m;})();

  /* ---------- the search ---------- */
  var tn=document.getElementById('tn'),tplace=document.getElementById('tplace'),tstate=document.getElementById('tstate'),tlab=document.getElementById('townlab');
  var xmin=-52,xmax=52;
  var greenX=[],TOTAL=0,sweepT0=-1,DUR=7200,scans=0,lastShown=-1;
  function rescan(place,total,initial){
    if(initial&&scans) return; scans++;
    var seedR=mulberry(hash(String(place||'Petaluma'))); var order=cand.slice();
    for(var k=order.length-1;k>0;k--){var jj=Math.floor(seedR()*(k+1));var tmp=order[k];order[k]=order[jj];order[jj]=tmp}
    var want=total?Math.min(cand.length,Math.max(12,Math.round(total))):Math.round(cand.length*0.45);
    var pick={}; pick[S]=1; for(var w=0,got=1;w<order.length&&got<want;w++){if(order[w]!==S){pick[order[w]]=1;got++}}
    greenX=[]; for(var ci=0;ci<cand.length;ci++){var id=cand[ci];kind[id]=pick[id]?2:4;if(pick[id])greenX.push(pts[id].x)}
    greenX.sort(function(a,b){return a-b}); kindAttr.needsUpdate=true; xmin=greenX[0]; xmax=greenX[greenX.length-1];
    TOTAL=total||0; if(place&&tplace)tplace.textContent=place;
    if(tn){tn.textContent=TOTAL?'0':'';} if(tstate)tstate.textContent=TOTAL?'scanning':'example';
    if(tlab)tlab.classList.toggle('nonum',!TOTAL);
    sweepT0=performance.now()+(reduced?-DUR:500); lastShown=-1; U.uFlip.value=0;
  }
  function litCount(x){var lo=0,hi=greenX.length;while(lo<hi){var mid=(lo+hi)>>1;if(greenX[mid]<x)lo=mid+1;else hi=mid}return lo}
  window.__town={rescan:function(p,t){rescan(p,t,false)}}; window.__townMarks=function(){return marks.slice()}; window.__townN=N;
  var EP=/staging\.|localhost|127\./.test(location.host)?'/towncheck':'https://app.unwebbed.app/towncheck';
  var initT=setTimeout(function(){rescan(null,0,true)},6000);
  if(window.__townDemo){ clearTimeout(initT); rescan(window.__townDemo.place,window.__townDemo.total,true); }
  else try{ fetch(EP+'?town='+encodeURIComponent('Petaluma, CA')).then(function(r){return r.json()}).then(function(d){clearTimeout(initT);if(d&&d.total)rescan(d.place||'Petaluma, CA',d.total,true);else rescan(null,0,true)}).catch(function(){clearTimeout(initT);rescan(null,0,true)}); }catch(e){ rescan(null,0,true) }

  /* ---------- the flight: keyframes on the page's timeline ----------
     u 0..1 the hero scrolls away · 1..2 the site builds · 2..3 the call · 3..4 the price */
  function V(x,y,z){return new THREE.Vector3(x,y,z)}
  var KP=[V(-22,84,66),V(-15,68,55),V(-6,48,40),V(SP.x-6,27,SP.z+25),V(SP.x-8,12,SP.z+14),V(SP.x-7.5,3.4,SP.z+6.5),V(SP.x+5.5,7.5,SP.z+6.5),V(SP.x+12,22,SP.z+24),V(-14,76,64)];
  var KT=[V(-3,0,-4),V(-1,0,-1),V(2,0,2),V(SP.x+1,0.5,SP.z+2),V(SP.x,1,SP.z),V(SP.x,1.3,SP.z),V(SP.x,1.1,SP.z),V(2,0,0),V(0,0,-2)];
  var KD=[95,80,64,44,30,20,20,40,95], KG=[1.1,1.08,1.0,0.9,0.75,0.55,0.55,0.45,0.6], KF=[0.0026,0.003,0.004,0.008,0.016,0.045,0.05,0.012,0.0026];
  var cp=new THREE.CatmullRomCurve3(KP,false,'catmullrom',0.5), ct=new THREE.CatmullRomCurve3(KT,false,'catmullrom',0.5);
  var hero=document.getElementById('top'),s2=document.getElementById('s2'),s3=document.getElementById('s3'),s4=document.getElementById('s4'),flow=document.querySelector('.flow');
  var marks=[0,1,2,3,4];
  function measure(){var y=scrollY;function top(el){return el?el.getBoundingClientRect().top+y:null}
    var t2=top(s2),t3=top(s3),t4=top(s4);if(t2==null||t3==null||t4==null)return;var tf=top(flow);if(tf==null)tf=t4+s4.offsetHeight-innerHeight;marks=[0,t2,t3,t4,tf];}
  function uOf(y){for(var i=0;i<4;i++){if(y<marks[i+1])return Math.max(0,i+(y-marks[i])/Math.max(1,marks[i+1]-marks[i]))}return 4}
  function lerpArr(arr,u){var f=u/4*(arr.length-1),i=Math.min(arr.length-2,Math.floor(f)),t=f-i;return arr[i]+(arr[i+1]-arr[i])*t}
  function sync(){var w=innerWidth,h=innerHeight;if(w!==W||h!==H){W=w;H=h;renderer.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix()}
    U.uScale.value=H*0.5/Math.tan(cam.fov*Math.PI/360);measure();}
  sync(); addEventListener('resize',sync); addEventListener('load',measure); if(window.ResizeObserver){new ResizeObserver(measure).observe(document.body)}
  var uS=uOf(scrollY),last=performance.now(),P=new THREE.Vector3(),T=new THREE.Vector3(),covered=false;

  function frame(now){
    requestAnimationFrame(frame);
    var dt=Math.min(0.05,(now-last)/1000); last=now;
    var y=scrollY, u=reduced?0:uOf(y);
    covered=y>marks[4]+innerHeight*0.15||document.hidden;
    if(covered) return;
    uS+=(u-uS)*(reduced?1:(1-Math.exp(-dt*6.5)));
    var t=uS/4;
    cp.getPoint(t,P); ct.getPoint(t,T);
    if(!reduced){var s=now/1000,alt=Math.min(1,P.y/80),amp=0.35+1.4*alt;P.x+=Math.sin(s*0.11)*amp;P.y+=Math.sin(s*0.073)*amp*0.45;P.z+=Math.cos(s*0.087)*amp;T.x+=Math.sin(s*0.09+1.0)*amp*0.3;}
    cam.position.copy(P); cam.lookAt(T);
    U.uFocus.value=P.distanceTo(T); U.uDof.value=lerpArr(KD,uS); U.uGain.value=lerpArr(KG,uS); U.uFog.value=lerpArr(KF,uS); if(glow) glow.material.opacity=0.62*Math.min(1,Math.max(0,(P.y-14)/40));
    U.uTime.value=now/1000;
    /* the search sweeps west to east across the town */
    if(sweepT0>0){var sp=Math.min(1,Math.max(0,(now-sweepT0)/DUR));U.uSweep.value=xmin-3+(xmax-xmin+6)*sp;
      var lit=litCount(U.uSweep.value); if(lit!==lastShown){lastShown=lit;if(TOTAL&&tn){tn.textContent=String(Math.round(TOTAL*lit/Math.max(1,greenX.length)))}}
      if(sp>=1){sweepT0=-1;if(tstate&&TOTAL)tstate.textContent='done · same search the tool runs';}}
    /* on the price chapter the found businesses go live one by one: green turns to warm light */
    U.uFlip.value=Math.min(1,Math.max(0,(uS-3.08)/0.7));
    renderer.render(scene,cam);
  }
  requestAnimationFrame(frame);
})();
