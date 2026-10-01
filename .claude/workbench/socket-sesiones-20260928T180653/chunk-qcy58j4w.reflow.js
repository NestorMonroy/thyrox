// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  ofn,sfn,sz,Iv,QDo,zFr,ZDo,yFe
}from"/$bunfs/root/chunk-5mcqvwzx.js";
import{
  N
}from"/$bunfs/root/chunk-8nz62976.js";
import{
  I,v,U
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  Q
}from"/$bunfs/root/chunk-jxwbd5gq.js";
import{
  b,J,t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  P,Kr,re
}from"/$bunfs/root/chunk-vq0drrah.js";
import{
  O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  Re
}from"/$bunfs/root/chunk-qbkceaaj.js";
import{
  f
}from"/$bunfs/root/chunk-bnk68ax9.js";
import{
  a,Gw
}from"/$bunfs/root/chunk-v49zfq06.js";
import{
  p
}from"/$bunfs/root/chunk-d09a8ccq.js";
import{
  cl,oFt,pA,vye,M1,lFt,cLo,dfn,mYe,lh,IL,Vce,mJ,qce
}from"/$bunfs/root/chunk-q8a07cv0.js";
import{
  Nh,Yce,TFe,x_,VE,nc,_Ye
}from"/$bunfs/root/chunk-x5vr5vwm.js";
import{
  HP
}from"/$bunfs/root/chunk-t0sp7zte.js";
import{
  opn,KKn,QKn,TCe,ZKn,lpn,x,rF
}from"/$bunfs/root/chunk-t6pwageh.js";
import{
  ti
}from"/$bunfs/root/chunk-s7j2aven.js";
import{
  dLe
}from"/$bunfs/root/chunk-2q63h0br.js";
import{
  Dae
}from"/$bunfs/root/chunk-0bhyq854.js";
import{
  dG
}from"/$bunfs/root/chunk-mwe1v51h.js";
import{
  bYe,hLo,mpt,fFt,yLo,ua
}from"/$bunfs/root/chunk-j2p7jgmc.js";
import{
  pn
}from"/$bunfs/root/chunk-xn8f4n02.js";
import{
  k,u
}from"/$bunfs/root/chunk-dk5kbfrn.js";
import{
  D,ri
}from"/$bunfs/root/chunk-153dnzje.js";
function K(e){
  if(O()==="windows")return null;
  let n=te(e);
  if(n<0)return null;
  try{
    return Bun.ant.getPeerUid(n)
  }catch(r){
    return t(`[daemon] peer uid lookup failed: ${r instanceof Error?r.message:String(r)}`,{
      level:"warn"
    }),null
  }
}function Ako(e,n=K){
  let r=process.getuid?.();
  if(r==null)return null;
  let i=n(e);
  if(i==null)return null;
  if(i===r)return null;
  let s=`permission denied: connecting uid ${i} != daemon uid ${r} (retry without sudo, or as the daemon owner)`;
  return t(`[daemon] rejecting control connection: ${s}`,{
    level:"error"
  }),s
}function lsn(e){
  if(O()==="windows")return;
  let n=te(e);
  try{
    let r=n<0?null:Bun.ant.getPeerPid(n);
    if(r!==null&&r>0)return r;
    t(`[peer-cred] peer pid unavailable (fd=${n}, got=${r})`,{
      level:"warn"
    });
    return
  }catch(r){
    t(`[peer-cred] peer pid lookup failed: ${r instanceof Error?r.message:String(r)}`,{
      level:"warn"
    });
    return
  }
}function te(e){
  let n=e._handle;
  return typeof n?.fd==="number"?n.fd:-1
}import{
  lstat as Ne,readdir as Me,stat as Ue,unlink as me
}from"fs/promises";
import{
  connect as ge
}from"net";
import{
  basename as Be,dirname as le,join as He
}from"path";
var WOt=1048576;
function M(e,n,r,i,s){
  let m=Math.max(0,r-n)/1000;
  return Math.min(i,e+m*s)
}function B(e){
  return e>=1
}function H(e,n,r,i,s=()=>!0){
  let m=e.get(n);
  if(m!==void 0)return e.delete(n),e.set(n,m),m;
  while(e.size>=Math.max(1,r)){
    let l;
    for(let[d,o]of e)if(s(o)){
      l=d;
      break
    }if(l??=e.keys().next().value,l===void 0)break;
    e.delete(l)
  }let g=i();
  return e.set(n,g),g
}var csn={
  bucketCapacity:30,refillPerSecond:0.5,dedupWindowMs:30000,maxSelfHops:10,maxChainLength:28,maxTrackedSenders:256
};
function _e(e,n){
  if(!e||n.size===0)return 0;
  let r=0;
  for(let i of e)if(n.has(i))r++;
  return r
}function LRr(e={
},n){
  let r={
    ...csn,now:()=>Date.now(),...e
  },i=()=>n?{
    ...r,...n()
  }:r,s=new Map;
  function m(d,o){
    return H(s,d,o.maxTrackedSenders,()=>({
      tokens:o.bucketCapacity,lastRefill:o.now(),lastBody:void 0,lastBodyAt:0
    }))
  }function g(d,o){
    let c=i();
    if(d!==void 0&&d.length>c.maxChainLength)return{
      admitted:!1,reason:"hop-runaway"
    };
    if(_e(d,o)>=c.maxSelfHops)return{
      admitted:!1,reason:"hop-loop"
    };
    return
  }function l(d){
    let o=i(),c=o.now(),E=g(d.hopChain,d.ownTokens);
    if(E)return E;
    let h=m(d.senderKey,o);
    if(h.lastBody!==void 0&&h.lastBody===d.body&&c-h.lastBodyAt<o.dedupWindowMs)return{
      admitted:!1,reason:"duplicate"
    };
    if(h.tokens=M(h.tokens,h.lastRefill,c,o.bucketCapacity,o.refillPerSecond),h.lastRefill=c,!B(h.tokens))return{
      admitted:!1,reason:"rate-limited"
    };
    return h.tokens-=1,h.lastBody=d.body,h.lastBodyAt=c,{
      admitted:!0
    }
  }return{
    admit:l,checkHopChain:g,trackedSenderCount:()=>s.size
  }
}var he={
  "rate-limited":!0,duplicate:!0,"hop-loop":!0,"hop-runaway":!0,"queue-full":!0
};
function ke(e){
  return typeof e==="string"&&Object.hasOwn(he,e)
}function Cko(e){
  return ke(e)?e:void 0
}var NRr=256,G=60000,oe=256,Ie=20;
function $Rr(e){
  ti().ingress.ownUdsHopToken=e===void 0?void 0:dLe(e)
}function GOt(e){
  ti().ingress.ownBridgePeerAddressResolver=e
}function FRr(){
  let{
    ownUdsHopToken:e,ownBridgePeerAddressResolver:n
  }=ti().ingress,r=new Set;
  if(e)r.add(e);
  let i=n?.();
  if(i)r.add(dLe(i));
  let s=Dae();
  if(s)r.add(dLe(vye(s)));
  return r
}var Ee={
  "rate-limited":"sender exceeded the peer message rate limit",duplicate:"identical to the previous message from this sender","hop-loop":"message has already passed through this session (a peer messaging loop)","hop-runaway":"peer relay chain is too long (runaway forwarding)","queue-full":"this session has too many undelivered peer messages queued"
};
function X(e){
  return{
    from:cLo(e.from)?e.from:"(unrenderable sender address)",name:e.name?oFt(e.name):""
  }
}function Rko(e){
  let{
    from:n
  }=X(e),{
    name:r
  }=X(e),i=r?`@${r} (${n})`:n,s=e.suppressed>0?` (+${e.suppressed} similar ${P(e.suppressed,"drop")} suppressed)`:"";
  return`Dropped a peer message from ${i}: ${Ee[e.reason]}.${s}`
}var xe=500,Ae=5000,ve=40;
function W(e,n){
  if(e.timer!==void 0)clearTimeout(e.timer),e.timer=void 0;
  let{
    pending:r,pendingIds:i,pendingSend:s
  }=e;
  if(e.pending=0,e.pendingIds=[],e.pendingSend=void 0,r>0&&s&&n())return s(i)
}function URr({
  trailMs:e=Ae
}={
}){
  let n=new Map,r=0,i=0;
  function s(S=Date.now()){
    if(S-r>=G)r=S,i=0;
    if(i>=ve)return!1;
    return i++,!0
  }function m(S,_,y,R=Date.now()){
    let w=n.get(S);
    if(w===void 0)w={
      lastImmediateAt:Number.NEGATIVE_INFINITY,pendingIds:[],pending:0,timer:void 0,pendingSend:void 0
    };
    if(n.delete(S),n.set(S,w),n.size>oe){
      let A=n.keys().next().value;
      if(A!==void 0&&A!==S){
        let L=n.get(A);
        if(n.delete(A),L!==void 0)W(L,()=>s(R))
      }
    }if(R-w.lastImmediateAt>=G&&w.pending===0){
      if(w.lastImmediateAt=R,s(R))y([]);
      return
    }if(w.pending++,_!==void 0&&w.pendingIds.length<NRr)w.pendingIds.push(_);
    if(w.pendingSend=y,w.timer===void 0)w.timer=setTimeout(W,e,w,s),w.timer.unref?.()
  }let g=new Map,l=0,d=0,o=0;
  function c(S,_=Date.now()){
    let y=X(S);
    t(`[peer-guard] drop ${S.reason} from ${y.from}${y.name?` (@${y.name})`:""}`);
    let R=`${S.from}\x00${S.reason}`,w=g.get(R);
    if(w&&_-w.lastReportAt<G){
      w.suppressed++;
      return
    }if(_-l>=G)l=_,d=0;
    if(d>=Ie){
      o++;
      return
    }d++;
    let A=(w?.suppressed??0)+o;
    if(o=0,g.delete(R),g.set(R,{
      lastReportAt:_,suppressed:0
    }),g.size>oe){
      let C=g.keys().next().value;
      if(C!==void 0)g.delete(C)
    }let L={
      ...S,suppressed:A
    };
    t(`[peer-guard] Dropped peer message from ${y.from}${y.name?` (@${y.name})`:""}: ${S.reason}${A>0?` (+${A} suppressed)`:""}`,{
      level:"warn"
    }),p("peer_loop_guard",S.reason),ti().ingress.messageDropped.emit(L)
  }async function E(S=xe){
    let _=[];
    for(let y of n.values())if(y.pending>0)_.push(W(y,s));
    else if(y.timer!==void 0)clearTimeout(y.timer),y.timer=void 0;
    if(_.length===0)return;
    await Promise.race([Promise.allSettled(_),Q(S,void 0,{
      unref:!0
    })])
  }function h(){
    for(let S of n.values())if(S.timer!==void 0)clearTimeout(S.timer);
    n.clear()
  }return{
    report:c,noteDropForReceipt:m,flushPendingReceipts:E,dispose:h
  }
}var De=50,z={
  ...csn,maxQueuedPeerMessages:De
},T=z,Le=f(()=>u({
  bucketCapacity:k().min(5).max(500).catch(T.bucketCapacity),refillPerSecond:k().min(0.05).max(50).catch(T.refillPerSecond),dedupWindowMs:k().int().min(0).max(600000).catch(T.dedupWindowMs),maxSelfHops:k().int().min(3).max(lFt).catch(T.maxSelfHops),maxChainLength:k().int().min(8).max(lFt-1).catch(T.maxChainLength),maxTrackedSenders:k().int().min(16).max(1e5).catch(T.maxTrackedSenders),maxQueuedPeerMessages:k().int().min(10).max(5000).catch(T.maxQueuedPeerMessages)
})),Te=300000;
function zOt(){
  let e=rF("tengu_harbor_kite_limits",z,Te),n=Le().safeParse(e);
  if(!n.success)return t("[peer-guard] tengu_harbor_kite_limits is not an object; using defaults",{
    level:"warn"
  }),z;
  return n.data
}function ie(e,n=Date.now){
  let r=new Map;
  function i(l,d){
    let{
      bucketCapacity:o,refillPerSecond:c,maxTrackedSenders:E
    }=e(),h=!1,S=H(r,l,E,()=>(h=!0,{
      tokens:o,updatedAt:d,sentInBurst:0,burstStartedAt:d
    }),(_)=>M(_.tokens,_.updatedAt,d,o,c)>=o);
    if(!h){
      S.tokens=M(S.tokens,S.updatedAt,d,o,c),S.updatedAt=d;
      let _=o/Math.max(c,0.000000001)*1000;
      if(S.tokens>=o||d-S.burstStartedAt>_)S.sentInBurst=0,S.burstStartedAt=d
    }return S
  }function s(l){
    let d=i(l,n());
    if(!B(d.tokens))return{
      ok:!1,sentInBurst:d.sentInBurst
    };
    d.tokens-=1,d.sentInBurst+=1;
    let o=d,c=!1;
    return{
      ok:!0,refund:()=>{
        if(c)return;
        c=!0,o.tokens=Math.min(e().bucketCapacity,o.tokens+1),o.sentInBurst=Math.max(0,o.sentInBurst-1)
      }
    }
  }function m(l){
    let d=i(l,n());
    d.tokens=Math.min(e().bucketCapacity,d.tokens+1),d.sentInBurst=Math.max(0,d.sentInBurst-1)
  }function g(l){
    let d=i(l,n());
    d.tokens=Math.max(0,d.tokens-1),d.sentInBurst+=1
  }return{
    reserve:s,credit:m,debit:g
  }
}var Oe=/[0-9a-f]{32,}/gi;
function se(e){
  return e.replace(Oe,(n)=>`<hex:${pn(n)}>`)
}function Bf(e,n=120){
  if(/token/i.test(e))return"(withheld)";
  return Kr(se(e),n)
}function TB(e){
  if(/token/i.test(e))return"(redacted: fragment may carry an auth token)";
  return Kr(se(e),200)
}var de="no_live_inbox",ae="ENOINBOX",ue="message_too_large";
function ce(e,n){
  return new I(`Message too large for cross-session delivery: the serialized message is ${e.toLocaleString("en-US")} characters and the limit is ${n.toLocaleString("en-US")}. Shorten the message text \u2014 put bulk content in a file the recipient can read rather than in the message \u2014 or split it into smaller messages.`,"cross-session message exceeds the line cap",ue)
}function R4e(e){
  return e instanceof I&&e.errorClass===ue
}var pe="sender_paced";
function fe(e){
  return new I(`Too many messages to this session just now: ${e} were sent recently and more would be dropped by its rate limit, so this one was not sent. Batch what remains into one message, or wait a little before sending more.`,"cross-session sends to one target outpaced its inbox rate limit",pe)
}function x4e(e){
  return e instanceof I&&e.errorClass===pe
}function A1n(e){
  let n=v(e);
  return n==="ENOENT"||n==="ECONNREFUSED"||e instanceof I&&e.errorClass===de
}class j extends I{
  kind;
  constructor(e,n){
    super(n,"no live inbox registered for the target pipe",de);
    this.name="NoLiveInboxError",this.kind=e
  }
}function C1n(e){
  return e instanceof j&&e.kind==="unusable"
}function Mae(e){
  if(C1n(e))return"busy";
  if(A1n(e))return"gone";
  let n=v(e);
  return n==="EBUSY"||n==="EAGAIN"?"busy":"other"
}function I4e(e){
  return` \u2014 the peer process may have restarted, so this socket path is stale. Call ${e} to get the current address.`
}var BRr=" \u2014 the peer is alive but its pipe is momentarily busy. Retry the same address shortly.",Fe=" \u2014 this machine's session registry could not be read just now (a transient local condition). Retry the same address shortly.";
function dsn(e){
  return C1n(e)?Fe:BRr
}class MV extends Error{
  refusal;
  constructor(e,n){
    super(n);
    this.name="UdsSendRefusedError",this.refusal=e
  }
}function cG(e){
  if(e instanceof MV||A1n(e)||x4e(e)||R4e(e))return!0;
  let n=v(e);
  return n==="EBUSY"||n==="EAGAIN"||n==="EACCES"
}function $e(e){
  if(typeof e!=="object"||e===null)return!1;
  let{
    name:n,until:r,sessionId:i
  }=e;
  return typeof n==="string"&&mpt(r)&&(i===void 0||typeof i==="string")
}function Ge(e){
  if(!Array.isArray(e))return[];
  return e.filter($e).slice(0,KKn).map(({
    name:n,until:r,sessionId:i
  })=>({
    name:re(n,pA),until:r,...i!==void 0&&{
      sessionId:re(i,pA)
    }
  }))
}function je(){
  return ti().outbound.pacer??=ie(zOt)
}var Ke={
  ok:!0,refund:()=>{
  }
};
function We(){
  if(a.CLAUDE_CODE_HARBOR_KITE_PACING_OFF)return!1;
  return!x("tengu_harbor_kite_pacing_off",!1)
}function jRr(e){
  Se(e,(n,r)=>n.credit(r))
}function R1n(e){
  Se(e,(n,r)=>n.debit(r))
}function Se(e,n){
  let r=ti().outbound.pacer;
  if(!r)return;
  let{
    scheme:i,target:s
  }=lh(e);
  if(i!=="uds")return;
  n(r,Iv(s)??s)
}async function VOt(e,n,r,i,s,m,g,{
  trackReceipts:l=!0,expectPeerPid:d,expectPeerProcStart:o,fromPlugin:c
}={
}){
  let E=DV(),h=E?M1(E):void 0,S=x("tengu_tidy_fern",!0)?QKn():void 0,_=mYe(h,i,n,S,dfn(m,h?dLe(h):void 0),g),y=dG(),R={
    ...y,type:"user",message:{
      role:"user",content:_
    },priority:"next",from:h,...c!==void 0&&{
      from_plugin:c
    },...(s?.length??0)>0&&{
      file_attachments:s
    }
  },w=ye(R),L=(h!==void 0||O()!=="windows")&&We()?je().reserve(Iv(e)??e):Ke;
  if(!L.ok)throw t(`[uds-client] paced: not sending to ${Bf(e)} \u2014 ${L.sentInBurst} sent this burst; its inbox rate limit would drop more`),fe(L.sentInBurst);
  if(t(`[uds-client] Sending ${n.length} chars to ${Bf(e)}`),l)Xe(y.msg_id,M1(e));
  try{
    await Pe(e,R,r,{
      noFollowSymlink:!0,preflightedJson:w,...d!==void 0&&{
        expectPeerPid:d
      },...o!==void 0&&{
        expectPeerProcStart:o
      }
    })
  }catch(C){
    if(cG(C)){
      if(L.refund(),l)ze(y.msg_id)
    }throw C
  }return{
    msgId:y.msg_id
  }
}var be=200;
function Xe(e,n){
  let r=ti().receipts.outstandingSends;
  if(r.length>=be)r.shift();
  r.push({
    msgId:e,to:n
  })
}function ze(e){
  let n=ti().receipts.outstandingSends,r=n.findIndex((i)=>i.msgId===e);
  if(r!==-1)n.splice(r,1)
}function WRr(e,n){
  if(typeof e!=="string")return;
  let{
    outstandingSends:r,awaitingTerminal:i
  }=ti().receipts,s=r.findIndex((g)=>g.msgId===e);
  if(s!==-1){
    let[g]=r.splice(s,1);
    if(!g)return;
    if(n==="held"){
      if(i.length>=be)i.shift();
      i.push(g)
    }return{
      destination:g.to,wasHeld:!1
    }
  }let m=i.findIndex((g)=>g.msgId===e);
  if(m!==-1&&n!=="held"){
    let[g]=i.splice(m,1);
    return g?{
      destination:g.to,wasHeld:!0
    }:void 0
  }return
}function GRr(e){
  let n=new Map;
  if(e.length===0)return n;
  let r=new Set(e),{
    outstandingSends:i,awaitingTerminal:s
  }=ti().receipts;
  for(let m of[i,s]){
    let g=m===s;
    for(let l=0;l<m.length;){
      let d=m[l];
      if(r.delete(d.msgId)){
        m.splice(l,1);
        let o=n.get(d.to)??{
          dropped:0,wereHeld:0
        };
        if(o.dropped++,g)o.wereHeld++;
        n.set(d.to,o)
      }else l++
    }
  }return n
}function kee(e,n,r={
}){
  return iat(e,n,dG(),r).then(()=>{
  })
}async function iat(e,n,r=dG(),{
  expectPeerPid:i,expectPeerProcStart:s,storageV5:m
}={
}){
  return t(`[uds-client] Sending control:${n.action} to ${Bf(e)}`),await Pe(e,{
    type:"control",...n,...r
  },m,{
    noFollowSymlink:!0,...i!==void 0&&{
      expectPeerPid:i
    },...s!==void 0&&{
      expectPeerProcStart:s
    }
  }),{
    msgId:r.msg_id
  }
}var Ve=150;
async function qOt(e){
  let n=Iv(e);
  if(n===void 0)return;
  for(let r of await F()){
    if(!r.sock||Iv(r.sock)!==n)continue;
    if(await q(r))return{
      pid:r.pid,features:r.peerFeatures,sessionId:r.sessionId,procStart:r.procStartFt??r.procStart
    }
  }return
}async function zRr(e){
  let n=D(e),r=new Map;
  if(n.length===0)return r;
  let i=sz(),m=(await Promise.all(n.map((l)=>Z(i,`${l}.json`)))).filter((l)=>l!==null&&Boolean(l.sock)),g=await Promise.all(m.map((l)=>q(l)));
  return m.forEach((l,d)=>{
    if(g[d]&&l.sock)r.set(l.pid,l.sock)
  }),r
}async function q(e){
  let n=e.procStartFt??e.procStart;
  if(n===void 0||Nh(e.pid))return!1;
  return await VE(e.pid,n)===!0
}function ye(e){
  let n=b(e),r=ZDo+n.length+1;
  if(r>WOt)throw ce(r,WOt);
  return n
}async function qe(e){
  let n=Iv(e);
  if(n===void 0)return!1;
  for(let r of await F()){
    if(!r.sock||Iv(r.sock)!==n)continue;
    if(Nh(r.pid))continue;
    if((r.procStartFt??r.procStart)!==void 0){
      if(await q(r))return!0;
      continue
    }if(ua(r.pid))return!0
  }return!1
}async function Pe(e,n,r,{
  noFollowSymlink:i=!1,expectPeerPid:s,expectPeerProcStart:m,preflightedJson:g
}={
}){
  let l=g??ye(n);
  if(!IL(e))throw new MV("non-local",`Refusing to connect: not a usable local IPC path (remote/UNC host, or a pipe name with extra segments or a trailing dot/space): ${e}`);
  let d=ofn(),o=await QDo(e,r,{
    requireLiveOwner:d
  }),c=o.kind==="token"?o.token:void 0;
  if(d&&o.kind!=="token"){
    if(!(o.kind==="no-key"&&await qe(e)))throw new j(o.kind,`No running session has registered an inbox at ${e} (${ae}: ${o.kind}) \u2014 refusing to send to an unvouched pipe`);
    c=void 0
  }let E=c!==void 0?zFr(c):"";
  if(i&&!(O()==="windows"&&qce(e)!==void 0)){
    let S;
    try{
      S=(await Ne(e)).isSymbolicLink()
    }catch(_){
      if(U(_))throw _;
      throw t(`[uds-client] reply target unvettable: ${v(_)??"lstat failed"}`),new MV("unvettable","Refusing to send: cannot vet reply target")
    }if(S)throw new MV("symlink","Refusing to send: reply target is a symlink")
  }let h=E+l+`
`;
  return new Promise((S,_)=>{
    let y=ge({
      path:e
    }),R=!1;y.setTimeout(5000,()=>{
      R=!0,y.destroy(),_(Error(`Timed out sending to ${e}`))
    }),y.on("error",(w)=>{
      R=!0,_(w)
    }),y.on("connect",()=>{
      if(s!==void 0&&O()!=="windows"){
        let w=lsn(y);if(w===void 0){
          R=!0,y.destroy(),_(new MV("endpoint-unverifiable","Refusing to send: connected endpoint identity could not be read"));return
        }if(w!==s){
          R=!0,y.destroy(),t(`[uds-client] connected endpoint is pid ${w}, expected ${s} \u2014 refusing to write`),_(new MV("wrong-endpoint","Refusing to send: connected endpoint is not the expected process"));return
        }let A=process.getuid?.(),L=K(y);if(A!==void 0&&L===null){
          R=!0,y.destroy(),_(new MV("endpoint-unverifiable","Refusing to send: connected endpoint owner could not be read"));return
        }if(A!==void 0&&L!==A){
          R=!0,y.destroy(),t(`[uds-client] connected endpoint is owned by uid ${L}, not ours \u2014 refusing to write`),_(new MV("wrong-endpoint","Refusing to send: connected endpoint is not owned by this user"));return
        }if(m!==void 0&&Yce(w)!==m){
          R=!0,y.destroy(),t(`[uds-client] connected endpoint pid ${w} is not the process that wrote to us (start token differs \u2014 recycled pid) \u2014 refusing to write`),_(new MV("wrong-endpoint","Refusing to send: connected endpoint is a different process with the expected pid"));return
        }
      }if(y.write(h),O()==="macos")setTimeout((w)=>{
        if(!w.destroyed)w.end()
      },Ve,y);else y.end()
    }),y.on("close",()=>{
      if(!R)t(`[uds-client] Sent to ${Bf(e)}`);S()
    })
  })
}function Y(e){
  return new Promise((n)=>{
    if(!IL(e)){
      n(!1);return
    }let r=ge({
      path:e
    }),i=(s)=>{
      r.destroy(),n(s)
    };r.on("connect",()=>i(!0)),r.on("error",(s)=>i(v(s)==="EBUSY")),r.setTimeout(250,()=>i(!1))
  })
}class KOt extends Error{
  code;
  constructor(e){
    super("session records directory unreadable");
    this.code=e;
    this.name="SessionRecordsUnreadableError"
  }
}async function F(e){
  let n=sz(),r;
  try{
    r=await Me(n)
  }catch(s){
    if(e?.rejectUnreadable&&!U(s))throw new KOt(v(s));
    return[]
  }return(await Promise.all(r.filter((s)=>/^\d+\.json$/.test(s)).map((s)=>Z(n,s,{
    rejectTornLiveRecord:e?.rejectTornLiveRecord
  })))).filter((s)=>s!==null)
}async function Z(e,n,r){
  let i=!1,s,m=He(e,n);
  try{
    let g=hLo(n);
    if(g===null)return null;
    let{
      pid:l
    }=g;
    if(!g.canonical)return me(m).catch(()=>{
    }),null;
    s=l;
    let d=await cl(m,bYe);
    if(d===null)return null;
    i=!0;
    let o=J(d),c=yLo(o);
    return{
      sock:typeof o.messagingSocketPath==="string"?o.messagingSocketPath:"",cwd:c.cwd,startedAt:c.startedAt,...fFt(o.nameSince)!==void 0&&{
        nameSince:fFt(o.nameSince)
      },procStart:c.procStart,...c.procStartFt!==void 0&&{
        procStartFt:c.procStartFt
      },name:typeof o.name==="string"?o.name:void 0,nameSource:o.nameSource==="user"||o.nameSource==="peer"||o.nameSource==="derived"||o.nameSource==="collision"||o.nameSource==="auto"||o.nameSource==="hook"?o.nameSource:void 0,formerNames:Ge(o.formerNames),kind:c.kind,sessionId:c.sessionId,jobId:typeof o.jobId==="string"?o.jobId:void 0,parkedJobId:typeof o.parkedJobId==="string"?o.parkedJobId:void 0,spare:o.spare===!0,bridgeSessionId:typeof o.bridgeSessionId==="string"?o.bridgeSessionId:void 0,logPath:typeof o.logPath==="string"?o.logPath:void 0,status:c.status,waitingFor:typeof o.waitingFor==="string"?o.waitingFor:void 0,updatedAt:fFt(o.updatedAt),statusUpdatedAt:fFt(o.statusUpdatedAt),entrypoint:c.entrypoint,...opn(o.hostSessionId)!==void 0&&{
        hostSessionId:opn(o.hostSessionId)
      },...c.pidDomain!==void 0&&{
        pidDomain:c.pidDomain
      },agent:typeof o.agent==="string"?o.agent:void 0,state:typeof o.state==="string"?o.state:void 0,detail:typeof o.detail==="string"?o.detail:void 0,tempo:o.tempo==="active"||o.tempo==="idle"||o.tempo==="blocked"?o.tempo:void 0,needs:typeof o.needs==="string"?o.needs:void 0,peerProtocol:typeof o.peerProtocol==="number"?o.peerProtocol:void 0,...Array.isArray(o.peerFeatures)&&{
        peerFeatures:Je(o.peerFeatures)
      },...{
      },tmux:typeof o.tmux==="string"?o.tmux:void 0,pid:l,file:m
    }
  }catch{
    if(r?.rejectTornLiveRecord&&i&&s!==void 0&&ua(s)){
      if(!r.isReread)return await Q(sfn),Z(e,n,{
        ...r,isReread:!0
      });
      let[g,l]=await Promise.all([Ue(m).then((d)=>d.mtimeMs,()=>{
        return
      }),_Ye(s)]);
      if(g!==void 0&&l!==null&&l>g+2000)return null;
      if(l===null&&!ua(s))return null;
      throw new KOt("EBADRECORD")
    }return null
  }
}function we(e,n){
  return e.pidDomain!==void 0&&e.pidDomain!==n
}async function G3o(e,n){
  let r=await HP();
  return e.some((i)=>i.sessionId===n&&we(i,r))
}async function YOt(){
  return(await F({
    rejectUnreadable:!0
  })).map(({
    file:e,...n
  })=>n)
}function V(e,n,r,i){
  if(N()&&i!==void 0){
    i.delete(Re.session(Be(e))).then((s)=>s.ok&&s.value.existed?ZKn(le(e),n,r,i):void 0).catch(()=>{
    });
    return
  }me(e).then(()=>ZKn(le(e),n,r,i)).catch(()=>{
  })
}async function D3(e,n){
  let r=await F({
    rejectUnreadable:n?.rejectUnreadable===!0,rejectTornLiveRecord:n?.rejectUnreadable===!0
  }),i=n?.rejectUnreadable===!0?await HP():void 0,s=(c)=>i!==void 0&&we(c,i),m=r.map((c)=>s(c)||ua(c.pid)),g=await Promise.all(r.map((c,E)=>m[E]&&(s(c)||x_(c.pid,c.procStartFt??c.procStart)))),l=await TCe(),d=l?await HP():"",o=[];
  for(let c=0;c<r.length;c++){
    let{
      file:E,...h
    }=r[c];
    if(g[c])o.push(h);
    else if(l&&lpn(h,d)&&Nh(h.pid))V(E,h.pid,d,e)
  }return o
}function DV(){
  return Gw.CLAUDE_CODE_MESSAGING_SOCKET
}async function VRr(){
  let e=DV();
  if(e===void 0)return!1;
  let n=await F(),r=await HP(),i=n.filter((m)=>m.sock&&m.pid!==process.pid&&!ne(m)&&yFe({
    sock:m.sock
  })&&mJ(m.sock,e));
  return(await Promise.all(i.map(async(m)=>await ee(m,r)==="present"&&await Y(m.sock)))).some(Boolean)
}async function ee(e,n){
  if(e.pidDomain!==n)return"present";
  if(Nh(e.pid))return"gone";
  let r=e.procStartFt??e.procStart;
  if(r===void 0)return"present";
  let i=await nc(e.pid);
  if(i===void 0||TFe(r,i))return"present";
  return await VE(e.pid,r)===!1?"recycled":"present"
}async function qRr(e){
  let n=DV(),r=(await F({
    rejectUnreadable:!0
  })).filter((d)=>d.sock&&!(n&&Vce(d.sock,n))&&!ne(d)),[i,s]=await Promise.all([TCe(),HP()]),[m,g]=await Promise.all([Promise.all(r.map((d)=>Y(d.sock))),Promise.all(r.map((d)=>ee(d,s)))]),l=[];
  for(let d=0;d<r.length;d++){
    let{
      file:o,...c
    }=r[d];
    if(g[d]==="gone"){
      if(i&&Nh(c.pid))V(o,c.pid,s,e)
    }else if(g[d]==="recycled")continue;
    else if(m[d])l.push(c);
    else if(i&&lpn(c,s)&&Nh(c.pid))V(o,c.pid,s,e)
  }return l
}async function XOt(e){
  let n=DV(),r=await F(),i=(o)=>Boolean(o.sock)&&!(n&&Vce(o.sock,n)),s=new Set(r.filter((o)=>o.sessionId===e&&o.parkedJobId!==void 0).map((o)=>o.parkedJobId)),m=r.filter((o)=>i(o)&&!ne(o)),g=m.filter((o)=>o.sessionId===e),l=m.filter((o)=>o.sessionId!==e&&o.jobId!==void 0&&s.has(o.jobId)),d=await HP();
  for(let o of g.concat(l)){
    let{
      file:c,...E
    }=o;
    if(await ee(E,d)==="present"&&await Y(E.sock))return E
  }return null
}function ne(e){
  return e.spare===!0||e.parkedJobId!==void 0
}function Je(e){
  return ri(e).filter((n)=>/^[a-z0-9_]{1,32}$/.test(n)).slice(0,16)
} export{
  Bf,TB,Ako,lsn,WOt,csn,LRr,Cko,NRr,$Rr,GOt,FRr,Rko,URr,zOt,R4e,x4e,A1n,C1n,Mae,I4e,BRr,dsn,MV,cG,jRr,R1n,VOt,WRr,GRr,kee,iat,qOt,zRr,KOt,G3o,YOt,D3,DV,VRr,qRr,XOt
};