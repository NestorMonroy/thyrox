// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  q,j,Y,qe
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  _m,l,v,U
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  Q,nt
}from"/$bunfs/root/chunk-jxwbd5gq.js";
import{
  gt,zo,t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  a,Gw
}from"/$bunfs/root/chunk-v49zfq06.js";
import{
  _,m,p
}from"/$bunfs/root/chunk-d09a8ccq.js";
import{
  Yce,aUr,hfn,nc
}from"/$bunfs/root/chunk-x5vr5vwm.js";
import{
  ofn,YDo,Iv,XDo,JDo,eLo,tLo
}from"/$bunfs/root/chunk-5mcqvwzx.js";
import{
  Sb
}from"/$bunfs/root/chunk-nzbykwxn.js";
import{
  Ur
}from"/$bunfs/root/chunk-8t4prm0f.js";
import{
  pYe,aLo,M1,zce,qCe,fJ,lh,IL,eUr
}from"/$bunfs/root/chunk-q8a07cv0.js";
import{
  TCe
}from"/$bunfs/root/chunk-t6pwageh.js";
import{
  g9r
}from"/$bunfs/root/chunk-zgj26xgq.js";
import{
  E2e,gE,Cgo,Aot
}from"/$bunfs/root/chunk-csayct82.js";
import{
  _ko,bko,LOt
}from"/$bunfs/root/chunk-wngxtykq.js";
import{
  ti
}from"/$bunfs/root/chunk-s7j2aven.js";
import{
  Bf,TB,lsn,WOt,Cko,NRr,$Rr,jRr,R1n,WRr,GRr,kee,qOt,zRr
}from"/$bunfs/root/chunk-qcy58j4w.js";
import{
  wS,Wkr
}from"/$bunfs/root/chunk-bhsyyycy.js";
import{
  E7e,anr,kJr,lnr,dbt,T7e,unr,fbt,C7e,nSe
}from"/$bunfs/root/chunk-dv9ctjss.js";
import{
  cno,dno,uno,gno,hno,mlr,glr,bno
}from"/$bunfs/root/chunk-y9vyg7zk.js";
import{
  qtr,Ktr,Ytr,KEn,ibt,Jtr,JEn,ZEn,enr,pqt
}from"/$bunfs/root/chunk-s0w8kgdv.js";
import{
  nlt
}from"/$bunfs/root/chunk-5ttwp861.js";
import{
  lEn,RVt,O_t
}from"/$bunfs/root/chunk-4v3yb6t3.js";
import{
  B4e
}from"/$bunfs/root/chunk-mwe1v51h.js";
import{
  an
}from"/$bunfs/root/chunk-tp36n59y.js";
import{
  qr
}from"/$bunfs/root/chunk-0qxzxz5e.js";
import{
  randomBytes as _e,randomUUID as We
}from"crypto";
import{
  unlinkSync as Ge
}from"fs";
import{
  chmod as Ae,lstat as K,mkdir as te,readdir as Ve,readlink as Xe,realpath as de,unlink as re
}from"fs/promises";
import{
  createServer as Be,Socket as He
}from"net";
import{
  basename as fe,dirname as I,isAbsolute as ie,join as L,normalize as je,resolve as ue
}from"path";
var Me=500,Fe=32;
class he{
  verdicts=new Map;
  lookup(e){
    let n=this.verdicts.get(e);
    if(n!==void 0)this.verdicts.delete(e),this.verdicts.set(e,n);
    return n
  }remember(e,n){
    if(this.verdicts.size>=Me){
      let i=this.verdicts.keys().next().value;
      if(i!==void 0)this.verdicts.delete(i)
    }this.verdicts.set(e,n)
  }
}var Pe=new q(()=>new he),Ne={
  readAncestors:async(e)=>{
    let{
      ancestors:n,readFailed:i,truncated:r
    }=await hfn(e);
    if(r&&!i&&!n.includes(process.pid))({
      ancestors:n,readFailed:i,truncated:r
    }=await hfn(e,Fe));
    if(!n.includes(process.pid)){
      if(i)throw Error("ancestry walk failed");
      if(r)throw Error("ancestry walk truncated (maxDepth) above the prefix")
    }return n
  },readStartToken:(e)=>nc(e,{
    skipCache:!0
  })
};
function Le(e,n=process.pid){
  if(n===1)return!1;
  return Array.isArray(e)&&e.includes(n)
}async function Ke(e,n=Ne){
  if(e===void 0||!Number.isInteger(e)||e<=0)return"no-evidence";
  let i;
  try{
    i=await n.readStartToken(e)
  }catch{
    i=void 0
  }if(i===void 0)return"no-evidence";
  let r=`${e}:${i}`,d=Pe.of(j().host),s=d.lookup(r);
  if(s!==void 0)return s?"self":"not-self";
  let w;
  try{
    w=await n.readAncestors(e)
  }catch{
    return"no-evidence"
  }let o;
  try{
    o=await n.readStartToken(e)
  }catch{
    o=void 0
  }if(o!==i)return"no-evidence";
  let g=process.pid!==1&&w.includes(process.pid);
  return d.remember(r,g),g?"self":"not-self"
}async function ye(e){
  let n=e.selfPid??process.pid;
  if(e.selfSentAncestry!==void 0&&n!==1)return Le(e.selfSentAncestry,n);
  if(!e.needsVerdict)return!1;
  if(n===1||e.platform==="windows")return e.childTokenPresented;
  if(e.platform!=="macos")return!1;
  let i=await(e.verdictOf??Ke)(e.verifiedPeerPid);
  return i==="self"||i==="no-evidence"&&e.childTokenPresented
}function c(){
  return O_t.of(j().host)
}function Pqo(){
  return c().lastStartFailureCause
}function Oqo(){
  return c().lastStartDegradedCause
}function we(e){
  let n=c();
  if(e==="key_publish_failed"&&n.lastStartDegradedCause==="primary_dir_refused_fell_back")return;
  n.lastStartDegradedCause=e
}function oEn(){
  return RVt(c())
}function le(e){
  if(typeof e!=="object"||e===null)return!1;
  if(!("type"in e))return!1;
  return typeof e.type==="string"
}function sEn(e){
  c().onRename=e
}function Hqo(e){
  c().onEnableRemoteControl=e
}function Se(e){
  return B4e(e)?e:e===void 0?"(none)":"(malformed)"
}function Ye(e){
  if(!Array.isArray(e))return[];
  let n=[];
  for(let i of e){
    if(n.length>=NRr)break;
    if(B4e(i))n.push(i)
  }return n
}function iEn(e){
  c().onPeerMessageStatus=e
}function Mqo(e){
  c().onEnqueue=e
}function Ie(e){
  if(e.session_id!==void 0&&e.session_id!==Y())return t(`[uds-messaging] Dropping ${Bf(e.type)} message: session_id mismatch (got "${Bf(String(e.session_id))}", expected "${Y()}")`,{
    level:"warn"
  }),!1;
  return!0
}async function ze(e,n,i,r,d){
  let s=e.message?.content;
  if(typeof s!=="string"||s.length===0){
    t("[uds-messaging] Ignoring user message with missing or non-string content",{
      level:"warn"
    });
    return
  }if(!Ie(e))return;
  let w=typeof e.uuid==="string"?e.uuid:We(),o=C7e();
  if(o!==void 0){
    nSe("uds: dropped before attachment materialization",o),kJr({
      kind:"peer",from:e.from??"unknown",...n!==void 0&&{
        verifiedPeerPid:n
      },...B4e(e.msg_id)&&{
        msg_id:e.msg_id
      }
    },"refused");
    return
  }let g=E2e(e.priority)??"next",E=g9r(s),u=pYe(e.from_plugin),y=await Aot({
    origin:{
      kind:"peer",...u!==void 0&&{
        plugin:u
      }
    },content:E
  });
  if(y.consumed!==void 0)return;
  using k=y.queueing;
  let f=typeof y.content==="string"?y.content:E,S=f;
  if(e.file_attachments!==void 0&&nlt())try{
    let{
      emitPeerFileReceiveTelemetry:F,injectPeerFilePrefix:P,materializeLocalPeerFiles:h
    }=await import("/$bunfs/root/chunk-yrfq0b3e.js"),A=await h(e.file_attachments);
    if(A.received>0)S=P(f,A.prefix),F("uds",A.received,A.verified)
  }catch(F){
    t(`[uds-messaging] Failed to materialize file_attachments: ${TB(String(F))}`,{
      level:"warn"
    })
  }let C=await ce(n,r,d),b=zce({
    kind:"peer",from:e.from??"unknown",...n!==void 0&&{
      verifiedPeerPid:n
    },...i!==void 0&&{
      verifiedPeerProcStart:i
    },...C&&{
      selfSent:C
    },...B4e(e.msg_id)&&{
      msg_id:e.msg_id
    },...u!==void 0&&{
      plugin:u
    },...qCe(s)
  },S,s),D={
    mode:"prompt",agentId:qe(),value:S,uuid:w,priority:g,origin:b,skipSlashCommands:!0,isMeta:!0,skipAttachments:!0
  };
  if(fbt(D)!=="accept")return;
  gE(D),k.queued(),t(`[uds-messaging] Routed user message to queue (priority=${g}): ${Bf(S,80)}`),c().onEnqueue?.(),Oe(D)
}function Oe(e){
  let n=e.origin?.kind==="peer"?e.origin:void 0,i=c().activeSocketPath;
  if(n!==void 0&&n.selfSent!==!0&&n.verifiedPeerPid!==void 0&&typeof n.from==="string"&&i!==void 0&&aEn(n.from,i,n.verifiedPeerPid)!==void 0)Wkr(n.from,n.verifiedPeerPid,n.verifiedPeerProcStart)
}function aEn(e,n,i){
  if(!e.startsWith("uds:")||!fJ(e))return;
  let r=lh(e).target;
  return r&&eUr(r,n,{
    verifiedPeerPid:i,ownerUids:c().peerDirOwnerUids
  })?r:void 0
}async function be(e,n,i,r,d){
  if(!le(e)){
    t("[uds-messaging] Ignoring message without valid type field",{
      level:"warn"
    });
    return
  }if(e.type==="user")await ze(e,n,i,r,d);
  else if(e.type==="control"){
    if(!Ie(e))return;
    if(e.action==="rename"&&typeof e.name==="string")c().onRename?.(e.name);
    else if(e.action==="peer_message_status"&&(e.status==="held"||e.status==="denied"||e.status==="expired"||e.status==="delivered"||e.status==="refused"||e.status==="dropped")){
      let s=e.status==="expired"&&e.status_detail==="refused"?"refused":e.status,w=WRr(e.orig_msg_id,s),o=w?.destination;
      if(e.status==="dropped"){
        let g=Cko(e.drop_reason),E=GRr(Ye(e.dropped_msg_ids));
        if(o!==void 0){
          let u=E.get(o)??{
            dropped:0,wereHeld:0
          };
          if(u.dropped++,w?.wasHeld)u.wereHeld++;
          E.set(o,u)
        }if(g==="queue-full")for(let[u,{
          wereHeld:y
        }]of E)for(let k=0;k<y;k++)R1n(u);
        if(E.size===0)t(`[uds-messaging] peer_message_status dropped: neither orig_msg_id=${Se(e.orig_msg_id)} nor any named id matches an outstanding send`);
        for(let[u,{
          dropped:y
        }]of E)c().onPeerMessageStatus?.("dropped",u,{
          dropReason:g,droppedCount:y
        })
      }else if(o===void 0)t(`[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${Se(e.orig_msg_id)}`);
      else{
        if(s==="held")jRr(o);
        else if(s==="delivered"&&w?.wasHeld)R1n(o);
        c().onPeerMessageStatus?.(s,o)
      }
    }else if(e.action==="notify_when_idle"){
      let s=qtr().safeParse(e);
      if(!s.success){
        t("[uds-messaging] notify_when_idle dropped: malformed frame"),p("cross_session_notify_idle","malformed_frame");
        return
      }let w=c().activeSocketPath,o=s.data.from,g=w!==void 0?aEn(o,w,n):void 0;
      if(w===void 0)t("[uds-messaging] notify_when_idle dropped: own inbox not bound (shutting down)"),p("cross_session_notify_idle","own_inbox_unbound");
      else if(g===void 0)t(`[uds-messaging] notify_when_idle dropped: reply address unshaped or outside our socket namespace (${Bf(o)})`),p("cross_session_notify_idle","unvettable_reply_target");
      else if(Iv(g)===Iv(w))t("[uds-messaging] notify_when_idle dropped: reply target is this session (self-target)"),p("cross_session_notify_idle","self_target_frame");
      else{
        let E=await ce(n,r,d),u=Ytr(o,g,s.data.msg_id,n,i,d==="peer",Ce(s.data.from_mode),E);
        if(t(`[uds-messaging] notify_when_idle from ${Bf(o)}: ${u}`),u==="full")pqt(g,s.data.msg_id,n,d==="peer",i)
      }
    }else if(e.action==="peer_idle_notice"){
      let s=Ktr().safeParse(e);
      if(!s.success){
        t("[uds-messaging] peer_idle_notice dropped: malformed frame"),p("cross_session_notify_idle","malformed_notice");
        return
      }if(!ibt(s.data.orig_msg_id)){
        t("[uds-messaging] peer_idle_notice: dropped (uncorrelated / already delivered / expired)");
        return
      }let w=await ce(n,r,d);
      if(!Jtr(s.data.orig_msg_id,s.data.state,s.data.finished_at,s.data.detail,Ce(s.data.from_mode),w))t(`[uds-messaging] peer_idle_notice not admitted: subscription for orig_msg_id=${Bf(s.data.orig_msg_id)} was already consumed`)
    }else if(e.action==="yield_artifact_replies"){
      let s=cno().safeParse(e);
      if(!s.success){
        t("[uds-messaging] yield_artifact_replies dropped: malformed frame"),p("artifact_comments_autoreact","yield_malformed_frame");
        return
      }let w=c().activeSocketPath,o=w!==void 0?aEn(s.data.from,w,n):void 0;
      if(w===void 0||o===void 0){
        t(`[uds-messaging] yield_artifact_replies dropped: ${w===void 0?"own inbox not bound":"reply address unshaped or outside our socket namespace"} (${Bf(s.data.from)})`),p("artifact_comments_autoreact","yield_unvettable_target");
        return
      }if(Iv(o)===Iv(w)){
        t("[uds-messaging] yield_artifact_replies dropped: reply target is this session");
        return
      }let g=await qOt(o);
      if(g===void 0||g.sessionId!==Y()||n!==void 0&&g.pid!==n){
        t(`[uds-messaging] yield_artifact_replies refused: requester is not a verified live session of this conversation (${Bf(s.data.from)})`),p("artifact_comments_autoreact","yield_requester_unverified"),glr(s.data,o,n===void 0?void 0:{
          pid:n,writeToken:i
        },Date.now(),{
          refuse:!0
        });
        return
      }glr(s.data,o,{
        pid:n??g.pid,procStart:i??(n===void 0||n===g.pid?g.procStart:void 0),writeToken:i
      },Date.now())
    }else if(e.action==="unyield_artifact_replies"){
      let s=uno().safeParse(e);
      if(!s.success||!bno(s.data,n))t("[uds-messaging] unyield_artifact_replies dropped: malformed, uncorrelated or already handed back")
    }else if(e.action==="artifact_replies_yielded"){
      let s=dno().safeParse(e);
      if(!s.success){
        t("[uds-messaging] artifact_replies_yielded dropped: malformed frame"),p("artifact_live_subscribe","yield_malformed_answer");
        return
      }if(!gno(s.data.orig_msg_id)){
        t("[uds-messaging] artifact_replies_yielded dropped: uncorrelated or already settled");
        return
      }hno(s.data,n)
    }else t(`[uds-messaging] Unhandled control action: ${Bf(String(e.action))}`)
  }else t(`[uds-messaging] Received unhandled message type: ${Bf(e.type)}`)
}function Qe(e,n,i,r,d){
  if(le(e)&&(e.type==="control"&&e.action!=="notify_when_idle"||e.type==="user"&&e.priority==="now"&&e.file_attachments===void 0)){
    be(e,n,i,r,d).catch((s)=>{
      t(`[uds-messaging] Failed to process message: ${s}`,{
        level:"warn"
      })
    });
    return
  }c().processingChain=c().processingChain.then(()=>be(e,n,i,r,d)).catch((s)=>{
    t(`[uds-messaging] Failed to process message: ${s}`,{
      level:"warn"
    })
  })
}var Je=3000;
function Ze(e=3000){
  return Promise.race([c().processingChain,Q(e,void 0,{
    unref:!0
  })])
}function en(e){
  e.setEncoding("utf8");
  let n=c().firstLineDeadlineMs,i=setTimeout(()=>{
    i=void 0;try{
      if(t(`[uds-messaging] Closing a connection that sent no complete line within ${n} ms`),!c().silentDropReported)c().silentDropReported=!0,p("cross_session_inbox_auth","silent_connection_deadline");e.destroy()
    }catch(b){
      t(`[uds-messaging] Failed to close a silent connection: ${b}`,{
        level:"warn"
      })
    }
  },n);
  i.unref();
  let r=()=>{
    if(i!==void 0)clearTimeout(i),i=void 0
  };
  e.once("close",r),e.once("error",r);
  let d,s,w=!1,o,g,E=process.pid!==1&&unr();
  if(E){
    let b=lsn(e),D=b!==void 0?Yce(b):void 0;
    if(b!==void 0&&D!==void 0)g={
      pid:b,token:D
    }
  }let u="",y,k=!1,f=(b)=>{
    if(t(`[uds-messaging] Dropped ${b} from a connection that did not authenticate; closing it`,{
      level:"warn"
    }),!c().authDropReported)c().authDropReported=!0,m("cross_session_inbox_auth","unauthed_drop");
    e.destroy()
  },S=(b)=>{
    let D=!k;
    if(k=!0,eLo(b)){
      if(D){
        if(y=tLo(b.token,c().activeTokens),y!==void 0&&!c().authOkReported)c().authOkReported=!0,_("cross_session_inbox_auth");
        if(y===void 0&&c().authRequired)f("a bad auth frame")
      }return
    }if(c().authRequired&&y===void 0){
      f(le(b)?`a '${Bf(b.type)}' line`:"a line");
      return
    }if(!w){
      if(d=lsn(e),s=d===void 0?void 0:g!==void 0?g.pid===d?g.token:void 0:Yce(d),w=!0,d!==void 0&&E)o=g!==void 0&&g.pid===d&&Yce(d)===g.token?aUr(d):[]
    }Qe(b,d,s,o,y)
  },C=(b)=>{
    try{
      S(b)
    }catch(D){
      t(`[uds-messaging] Failed to handle line: ${D}`,{
        level:"warn"
      })
    }
  };
  e.on("data",(b)=>{
    if(u+=b,u.length>WOt){
      t(`[uds-messaging] Line exceeded ${WOt} chars; dropping connection`,{
        level:"warn"
      }),e.destroy(),u="";return
    }let D;while((D=u.indexOf(`
`))!==-1){
      let F=u.slice(0,D);if(u=u.slice(D+1),r(),!F.trim()){
        if(c().authRequired&&y===void 0){
          k=!0,f("a blank line"),u="";return
        }continue
      }let P;try{
        P=zo(F)
      }catch{
        if(t(`[uds-messaging] Failed to parse JSON line: ${TB(F)}`,{
          level:"warn"
        }),c().authRequired&&y===void 0){
          k=!0,f("an unparseable line"),u="";return
        }continue
      }if(C(P),e.destroyed){
        u="";return
      }
    }
  }),e.on("end",()=>{
    if(u.trim()&&!e.destroyed){
      let b,D=!1;try{
        b=zo(u),D=!0
      }catch{
        if(t(`[uds-messaging] Failed to parse final buffer: ${TB(u)}`,{
          level:"warn"
        }),c().authRequired&&y===void 0)f("an unparseable final fragment")
      }if(D)C(b)
    }e.end()
  }),e.on("error",(b)=>{
    t(`[uds-messaging] Connection error: ${b.message}`,{
      level:"warn"
    })
  })
}function Dqo(){
  return c().activeSocketPath
}var z=103;
function W1o(){
  let e=a.XDG_RUNTIME_DIR||Sb(),n=ue(L(e,"cc-socks",`${process.pid}.sock`));
  if(Buffer.byteLength(n)<=z)return n;
  return p9r()
}function p9r(e=process.getuid?.()??0){
  let n=a.TERMUX_VERSION?a.PREFIX:void 0,i=n?L(n,"tmp"):"/tmp";
  return L(i,`cc-socks-${e}`,`${process.pid}.sock`)
}async function B(e,n,i,{
  settleHeld:r=!0
}={
}){
  for(let o of c().connectedClients)o.destroy();
  if(c().connectedClients.clear(),e.close(),r)enr();
  let d=r?dbt():void 0;
  await Ze();
  let s=r?nt(KEn("exited"),Je):void 0;
  if(await d,await s,r)await Cgo();
  try{
    await re(n)
  }catch{
  }let w=c();
  if(w.activeKeyFile!==void 0)await JDo(w.activeKeyFile,i),w.activeKeyFile=void 0;
  H()
}function H(){
  c().activeSocketPath=void 0,c().activeTokens=void 0,delete process.env.CLAUDE_CODE_MESSAGING_SOCKET,Gw.unset("CLAUDE_CODE_MESSAGING_TOKEN"),$Rr(void 0),anr(null),lnr(null),JEn(null),mlr(null),ZEn(null),wS().senderMode=null
}function nn(e,n,i,r){
  return async()=>{
    await B(e,n,i),r()
  }
}function me(e){
  return new Promise((n)=>{
    let i=new He,r=(d)=>{
      i.destroy(),n(d)
    };i.on("connect",()=>r("live")),i.on("error",()=>r("dead")),i.setTimeout(250,()=>r("dead")),i.connect({
      path:e
    })
  })
}function ne(e,n){
  return new Promise((i,r)=>{
    function d(s){
      if(v(s)==="EADDRINUSE")i(!1);else r(s)
    }e.once("error",d),e.listen(n,()=>{
      e.removeListener("error",d),i(!0)
    })
  })
}function tn(e){
  let n=`${e.replace(/\.sock$/,"")}-${_e(4).toString("hex")}.sock`;
  if(Buffer.byteLength(n)<=z)return n;
  let i=L(e,".."),r=z-Buffer.byteLength(L(i,".sock"));
  return L(i,`${_e(8).toString("hex").slice(0,Math.max(1,r))}.sock`)
}async function sn(e){
  let n=`${fe(e).replace(/\.sock$/,"")}-`,i;
  try{
    i=await Ve(I(e))
  }catch{
    return
  }for(let r of i){
    if(!r.startsWith(n)||!/^[0-9a-f]{8}\.sock$/.test(r.slice(n.length)))continue;
    let d=L(I(e),r);
    if(await me(d)==="live")continue;
    try{
      await re(d),t(`[uds-messaging] Reaped stale moved-aside socket ${d}`)
    }catch{
    }
  }
}async function rn(e,n){
  if(await sn(n),await ne(e,n))return n;
  if(await me(n)!=="live"){
    try{
      await re(n)
    }catch{
    }if(await ne(e,n))return n
  }for(let i=0;i<3;i++){
    let r=tn(n);
    if(t(`[uds-messaging] Auto socket path ${n} is another session's live socket (sibling pid namespace?); binding at ${r} instead`,{
      level:"warn"
    }),await ne(e,r))return r
  }throw Error("listen EADDRINUSE on the auto socket path and its moved-aside siblings")
}function Lqo(e,n,i={
}){
  return z1o(e??W1o(),n,{
    isExplicit:e!==void 0,profileStartup:i.profileStartup
  })
}function W(){
  Gw.unset("CLAUDE_CODE_MESSAGING_SOCKET"),Gw.unset("CLAUDE_CODE_MESSAGING_TOKEN")
}var on=["directory_rule","foreign_owner","leaf_shape","dangling_link","raced","not_directory","symlink_loop","uid_collapse","internal"];
function M(e,n,i){
  return Object.assign(n,{
    socketsDirVetKind:e,...i&&{
      refusedComponent:i
    }
  })
}function dn(e){
  if(!(e instanceof Error)||!("refusedComponent"in e))return;
  let n=e.refusedComponent;
  return typeof n==="object"&&n!==null&&"path"in n&&typeof n.path==="string"&&"uid"in n&&typeof n.uid==="number"&&"gid"in n&&typeof n.gid==="number"&&"mode"in n&&typeof n.mode==="number"?{
    path:n.path,uid:n.uid,gid:n.gid,mode:n.mode,ownerRefused:"ownerRefused"in n&&typeof n.ownerRefused==="boolean"?n.ownerRefused:void 0
  }:void 0
}function V(e,n,i){
  return{
    path:e,uid:n.uid,gid:n.gid,mode:n.mode&4095,...i!==void 0&&{
      ownerRefused:i
    }
  }
}function Te(e){
  if(se(e)==="uid_collapse")return"this process runs in a user namespace without a uid mapping, so file ownership cannot be verified \u2014 start it with a uid map (e.g. unshare -Ur), or pass --messaging-socket-path";
  let n=dn(e);
  if(n===void 0)return;
  let i=n.mode.toString(8).padStart(4,"0"),r=`(owner ${n.uid}:${n.gid}, mode ${i})`,d="or pass --messaging-socket-path",s=an(n.path),w=s===n.path,o=`'${Array.from(s,(u)=>{if(un.test(u))return u;return w=!1,"?"}).join("")}'`,g=w,E=(u,y)=>g?`chmod ${u} ${qr([n.path])}${y}`:`clear its ${u==="o-w"?"other":"group"}-write bit${y}`;
  switch(se(e)){
    case"directory_rule":{
      if(n.ownerRefused===!0)return`${o} is not owned by you or root ${r} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${d}`;
      let u=(n.mode&512)!==0;
      if(!u&&(n.mode&2)!==0)return`${o} is world-writable without the sticky bit ${r} \u2014 ${E("o-w"," (or chmod +t)")}, ${d}`;
      if(!u&&(n.mode&16)!==0)return`${o} is group-writable without the sticky bit ${r} \u2014 ${E("g-w","")}, ${d}`;
      return`${o} is not owned by you or root ${r} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${d}`
    }case"foreign_owner":return`${o} is owned by another user ${r} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${d}`;
    case"not_directory":case"leaf_shape":return`${o} is not a directory ${r} \u2014 remove it or use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${d}`;
    case"dangling_link":case"raced":case"symlink_loop":case"uid_collapse":case"internal":case void 0:return
  }
}var un=/^[A-Za-z0-9._\/ ~+=:@,#%-]$/,cn=new Set(["EACCES","EPERM","EROFS","ENOSPC","EDQUOT","ENOTDIR"]);
function fn(e){
  switch(se(e)){
    case"directory_rule":case"foreign_owner":case"leaf_shape":case"not_directory":return!0;
    case"dangling_link":case"symlink_loop":case"raced":case"uid_collapse":case"internal":return!1;
    case void 0:break
  }let n=v(e);
  return n!==void 0&&cn.has(n)
}function se(e){
  if(!(e instanceof Error)||!("socketsDirVetKind"in e))return;
  let n=e.socketsDirVetKind;
  return on.find((i)=>i===n)
}function Ee(){
  return M("dangling_link",Error("a component of the sockets path is a symlink whose target does not exist \u2014 create the target (0700) or repoint the link"))
}var X="Point XDG_RUNTIME_DIR or CLAUDE_CODE_TMPDIR at a private (0700) directory you own to use a different location.",ke=`A component of the sockets path is not a directory (a regular file is in the way). ${X}`,ve=`The sockets path runs through a symlink loop. ${X}`,ln="This process runs in a user namespace without a uid mapping (its own uid reads as the kernel overflow uid), so file ownership cannot be verified. Start it with a uid map (e.g. `unshare -Ur` / `--map-current-user`), or pass --messaging-socket-path.";
function De(e){
  switch(se(e)){
    case"directory_rule":return`A directory on the sockets path is shared (world- or group-writable without the sticky bit, e.g. a container volume mounted at /tmp) or not owned by you or root. ${X}`;
    case"foreign_owner":case"leaf_shape":return X;
    case"not_directory":return ke;
    case"symlink_loop":return ve;
    case"uid_collapse":return ln;
    case"dangling_link":case"raced":case"internal":return"";
    case void 0:break
  }switch(v(e)){
    case"ENOTDIR":return ke;
    case"ELOOP":return ve;
    case"EACCES":case"EPERM":return`This user lacks permission on part of the sockets path (an ancestor is not searchable, or the parent is not writable). ${X}`;
    case"ENOENT":return`An ancestor of the sockets path does not exist. ${X}`;
    default:return""
  }
}function $e(e,n,i){
  c().lastStartFailureCause="socket_dir_refused";
  let r=Te(n);
  c().lastStartFailureDetail=r,H(),t(`[uds-messaging] Failed to set up sockets directory ${e} (refusing to bind \u2014 cross-session messaging is OFF for this session): ${l(n)}.${r?` Refused component: ${r}.`:""}${i?` ${i}`:""}`,{
    level:"error"
  }),W();
  return
}async function Re(e){
  if(!ie(e))throw M("internal",Error("sockets directory must be absolute here"));
  let n=process.getuid?.(),i=(h)=>{
    if(h.isSymbolicLink())throw M("leaf_shape",Error("sockets directory is a symlink \u2014 refusing to use it"),V(e,h));
    if(!h.isDirectory())throw M("leaf_shape",Error("sockets directory exists but is not a directory"),V(e,h));
    if(n!==void 0&&!r(h.uid))throw M("foreign_owner",Error("sockets directory is owned by another user \u2014 refusing to use it"),V(e,h))
  },r=(h)=>h===n,d=process.getgid?.(),s=await bko();
  if(s?.uidCollapses)throw M("uid_collapse",Error("this process reads as the kernel overflow uid (user namespace without a uid mapping) \u2014 ownership cannot be verified; refusing to use the sockets directory"));
  r=(h)=>h===n&&!s?.uidCollapses;
  let w=_ko(),o=async(h,A)=>{
    try{
      let R=A.isSymbolicLink()?L(await de(I(h)),fe(h)):await de(h),N=await K(R);
      return N.dev===A.dev&&N.ino===A.ino?R:void 0
    }catch{
      return
    }
  },g=(h)=>s!==void 0&&(s.unmappedOwnerUid!==void 0&&h===s.unmappedOwnerUid||h===0&&s.rootUidAmbiguous),E=g,u=(h)=>h!==void 0&&w.has(h),y=(h,A,R)=>n===void 0||r(h)||!A&&(g(h)?u(R):h===0),k=(h,A,R)=>{
    if(!y(h.uid,A,R))return!1;
    if((h.mode&512)!==0)return!0;
    if((h.mode&2)!==0)return!1;
    if((h.mode&16)!==0)return r(h.uid)&&d!==void 0&&h.gid===d&&d===n;
    return!0
  },f=a.TERMUX_VERSION&&a.PREFIX?I(I(a.PREFIX)):void 0,S=(h)=>I(h)===h||h===f,C=async(h,A,R=0)=>{
    if(R>16)throw M("symlink_loop",Error("sockets-directory chain: too many levels of symlinks"));
    let N=!1,pe,ge=!1;
    for(let x=h,J=!0;;x=I(x),J=!1){
      let T;
      try{
        T=await K(x)
      }catch(G){
        if(!U(G))throw G
      }if(T!==void 0){
        pe??=x;
        let G=J&&A;
        if(T.isSymbolicLink()){
          ge=!0;
          let Z=E(T.uid)?await o(x,T):void 0;
          if(!y(T.uid,!1,Z))throw M("foreign_owner",Error("a sockets-directory component is a symlink owned by another user \u2014 refusing to use it"),V(x,T));
          let ee=(await Xe(x)).replace(/\/{2,}/g,"/"),oe=ee.length>1&&ee.endsWith("/")?ee.slice(0,-1):ee,xe=ie(oe)?oe:`${await de(I(x))}/${oe}`,{
            startExists:Ue
          }=await C(xe,G,R+1);
          if(J)N=Ue
        }else{
          if(!T.isDirectory())throw M("not_directory",Error("a sockets-directory component exists but is not a directory \u2014 refusing to use it"),V(x,T));
          let Z=E(T.uid)?await o(x,T):void 0;
          if(!k(T,G,Z))throw M("directory_rule",Error("a sockets-directory component is not a private-or-sticky directory owned by us or root \u2014 refusing to use it"),V(x,T,!y(T.uid,G,Z)));
          if(J)N=!0
        }
      }if(S(x))break
    }return{
      startExists:N,deepestExisting:pe,sawSymlink:ge
    }
  },b=I(e),D=await C(b,!1),F=!D.startExists,P;
  try{
    P=await K(e)
  }catch(h){
    if(!U(h))throw h
  }if(F&&D.deepestExisting===b)throw Ee();
  if(F){
    let h=[],A=(R)=>{
      if(!R.isDirectory()||n!==void 0&&!r(R.uid))throw M("raced",Error("a sockets-directory component appeared while being created and is not our directory \u2014 refusing to use it"))
    };
    for(let R=b;R!==D.deepestExisting&&!S(R);R=I(R))h.unshift(R);
    for(let R of h)try{
      await te(R,{
        mode:448
      })
    }catch(N){
      if(U(N)&&D.sawSymlink)throw Ee();
      if(v(N)!=="EEXIST")throw N;
      A(await K(R))
    }if(!(await C(b,!0)).startExists)throw M("raced",Error("sockets base directory vanished while being set up"))
  }if(P===void 0){
    try{
      await te(e,{
        mode:448
      })
    }catch(h){
      if(v(h)!=="EEXIST")throw h
    }P=await K(e)
  }if(i(P),(P.mode&511)!==448)await Ae(e,448)
}async function G1o(e){
  if(!ie(e))throw new _m(e===""?"--messaging-socket-path was given an empty value (an unset shell variable?). Pass an absolute socket path.":`--messaging-socket-path must be an absolute path, got: ${e}`);
  if(e.split("/").includes(".."))throw new _m(`--messaging-socket-path must not contain '..' segments, got: ${e}`);
  let i=e.split("/").at(-1);
  if(i===""||i===".")throw new _m(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  let r=je(e).replace(/\/+$/,"");
  if(r===""||!r.startsWith("/")||fe(r)==="")throw new _m(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  if(!IL(r)||!IL(e))throw new _m(`--messaging-socket-path must be a local socket path, got: ${e}`);
  if(Buffer.byteLength(r)>z)throw new _m(`--messaging-socket-path is too long for a Unix socket (${Buffer.byteLength(r)} bytes, max ${z}): ${r}. Choose a shorter path, e.g. under $XDG_RUNTIME_DIR or /tmp/<private-dir>.`);
  let d=I(r),s="Use a private directory you own that only you use, e.g. mkdir -m 700 <dir> (or chmod 700 an existing one).",w=(f)=>{
    if(f.isSymbolicLink())throw new _m(`--messaging-socket-path directory must be a real directory, not a symlink: ${d}. ${s}`);
    if(!f.isDirectory())throw new _m(`--messaging-socket-path parent is not a directory: ${d}.`);
    let S=process.getuid?.();
    if(S!==void 0&&f.uid!==S)throw new _m(`--messaging-socket-path directory ${d} is not owned by you (uid ${f.uid}). ${s}`);
    if((f.mode&63)!==0)throw new _m(`--messaging-socket-path directory ${d} is not private (mode ${(f.mode&4095).toString(8)}); the socket directory must be mode 0700 so no other user or group can reach or replace the socket. ${s}`)
  },o=async()=>{
    try{
      return await K(d)
    }catch(f){
      let S=v(f);
      if(U(f))return;
      if(S==="ENOTDIR"||S==="EACCES"||S==="ELOOP"||S==="ENAMETOOLONG")throw new _m(`--messaging-socket-path directory is not usable: ${d} (${S}). Fix the path or its permissions, or choose another path. ${s}`);
      throw new _m(`--messaging-socket-path directory could not be examined: ${d} (${S??String(f)}). ${s}`)
    }
  },g=await o();
  if(g!==void 0)return w(g),r;
  let E=process.getuid?.(),u=[];
  for(let f=I(d);;f=I(f)){
    let S;
    try{
      S=await K(f)
    }catch(C){
      if(!U(C))throw new _m(`--messaging-socket-path: cannot inspect ${f} (${v(C)??C}). ${s}`);
      u.unshift(f)
    }if(S!==void 0){
      if(E!==void 0&&S.uid!==E&&S.uid!==0)throw new _m(`--messaging-socket-path: ${f} ${S.isSymbolicLink()?"is a symlink":"is a directory"} owned by another user \u2014 refusing to create your sockets directory ${S.isSymbolicLink()?"through":"inside"} it. ${s}`);
      break
    }if(I(f)===f)break
  }let y=!1;
  try{
    for(let f of u)try{
      await te(f,{
        mode:448
      })
    }catch(S){
      if(v(S)!=="EEXIST")throw S;
      let C=await K(f);
      if(!C.isDirectory()||E!==void 0&&C.uid!==E)throw new _m(`--messaging-socket-path: ${f} appeared while your sockets directory was being created and is not a directory you own \u2014 refusing to use it. ${s}`)
    }try{
      await te(d,{
        mode:448
      }),y=!0
    }catch(f){
      if(v(f)!=="EEXIST")throw f
    }
  }catch(f){
    if(f instanceof _m)throw f;
    throw new _m(`--messaging-socket-path directory ${d} does not exist and could not be created (${v(f)??f}). ${s}`)
  }let k=await o();
  if(k===void 0)throw new _m(`--messaging-socket-path directory ${d} vanished while being set up. ${s}`);
  if(!y)return w(k),r;
  return w(k),r
}async function z1o(e,n,i={
}){
  c().startInFlight=!0;
  try{
    return await mn(e,n,i)
  }finally{
    c().startInFlight=!1
  }
}async function mn(e,n,i={
}){
  if(c().lastStartFailureCause="bind_failed",c().lastStartDegradedCause=void 0,!IL(e)){
    if(t(`[uds-messaging] Refusing socket path \u2014 ${"not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space)"}: ${e}`,{
      level:"error"
    }),W(),c().lastStartFailureCause="path_refused",i.isExplicit)throw new _m(`--messaging-socket-path ${e} is not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space).`);
    return
  }if(!i.isExplicit&&!0&&!ie(e))e=ue(e);
  if(i.isExplicit){
    if(e=await G1o(e),await me(e)==="live")throw new _m(`--messaging-socket-path points to a live socket: ${e}. Another process is listening there. Remove it or choose a different path.`)
  }else{
    let o=I(e);
    try{
      await Re(o)
    }catch(g){
      let E=fn(g)?await LOt():void 0,u=E===void 0?void 0:ue(p9r(E)),y=u===void 0?void 0:L(u,"..");
      if(u===void 0||y===void 0||y===o)return $e(o,g,De(g));
      let k=Te(g);
      t(`[uds-messaging] sockets directory ${o} refused (${l(g)}${k?`; refused component: ${k}`:""}); trying the per-uid fallback ${y}`,{
        level:"warn"
      });
      try{
        await Re(y)
      }catch(f){
        return $e(y,f,De(f))
      }e=u,we("primary_dir_refused_fell_back")
    }
  }if(i.isExplicit)try{
    await re(e)
  }catch{
  }if(c().activeSocketPath=e,i.profileStartup)Ur("uds_inbox_dir_ready");
  let d,s;
  try{
    d=Be({
      allowHalfOpen:!0
    },(o)=>{
      c().connectedClients.add(o),t("[uds-messaging] Client connected"),en(o),o.on("close",()=>{
        c().connectedClients.delete(o),t("[uds-messaging] Client disconnected")
      })
    })
  }catch(o){
    H(),t(`[uds-messaging] Failed to create server: ${String(o)}`,{
      level:"error"
    }),W();
    return
  }d.on("error",(o)=>{
    t(`[uds-messaging] Server error: ${o.message}`,{
      level:"error"
    })
  }),c().authRequired=i.requireAuth??ofn(),c().firstLineDeadlineMs=i.firstLineDeadlineMs??lEn;
  let w=YDo();
  c().activeTokens=w;
  try{
    if(i.isExplicit){
      if(!await ne(d,e))throw Error("listen EADDRINUSE on the requested socket path")
    }else e=await rn(d,e),c().activeSocketPath=e;
    if(i.profileStartup)Ur("uds_inbox_listening");
    {
      let u=await LOt(),y=process.getuid?.();
      c().peerDirOwnerUids=[...y!==void 0?[y]:[],...u!==void 0&&u!==y?[u]:[]]
    }d.unref();
    let o=gt(async()=>{
      t("[uds-messaging] Shutting down"),await B(d,e,n)
    });
    s=o,await Ae(e,384);
    try{
      c().activeKeyFile=await XDo(e,w.peerToken,n,{
        sweepPermitted:await TCe()
      }),hn()
    }catch(u){
      if(c().authRequired){
        if(t(`[uds-messaging] Failed to publish the inbox auth key (refusing to run an inbox no peer can authenticate to): ${u}`,{
          level:"error"
        }),c().lastStartFailureCause="key_publish_failed",await B(d,e,n,{
          settleHeld:!1
        }),o(),W(),i.isExplicit)throw new _m(`--messaging-socket-path: bound ${e} but could not publish its auth key (${v(u)??u}); peers could not authenticate, so the inbox was closed. Check that the session registry directory is writable by you.`);
        return
      }t(`[uds-messaging] Failed to publish the inbox auth key; peers will send unauthenticated (accepted: auth is optional on this platform): ${u}`,{
        level:"warn"
      }),we("key_publish_failed")
    }if(i.profileStartup)Ur("uds_inbox_key_published");
    process.env.CLAUDE_CODE_MESSAGING_SOCKET=e,Gw.set("CLAUDE_CODE_MESSAGING_TOKEN",w.childToken),$Rr(M1(e));
    let g=M1(e);
    return lnr(Oe),wS().senderMode=f9r,JEn((u,y,k,f,S)=>kee(u,{
      action:"peer_idle_notice",...y,from:g,...f?gn():{
      }
    },{
      ...k!==void 0&&{
        expectPeerPid:k
      },...S!==void 0&&{
        expectPeerProcStart:S
      },storageV5:n
    })),mlr((u,y,k,f)=>kee(u,{
      action:"artifact_replies_yielded",...y,from:g
    },{
      ...k!==void 0&&{
        expectPeerPid:k
      },...f!==void 0&&{
        expectPeerProcStart:f
      },storageV5:n
    }),g),ZEn((u)=>zRr(u)),anr((u,y,k)=>{
      let f=u.origin?.kind==="peer"?u.origin:void 0,S=f?.from;if(typeof S!=="string")return;let C=aEn(S,e,f?.verifiedPeerPid);if(C===void 0){
        t(`[uds-messaging] hold-receipt skipped: reply address unshaped or outside our socket namespace (${Bf(S)})`);return
      }return kee(C,{
        action:"peer_message_status",...y==="refused"?{
          status:"expired",status_detail:"refused"
        }:{
          status:y
        },reason:pn(y),from:g,...typeof f?.msg_id==="string"&&{
          orig_msg_id:f.msg_id
        },...y==="dropped"&&k!==void 0&&{
          drop_reason:k.dropReason,dropped_msg_ids:k.droppedMsgIds
        }
      },{
        ...f?.verifiedPeerPid!==void 0&&{
          expectPeerPid:f.verifiedPeerPid
        },...f?.verifiedPeerProcStart!==void 0&&{
          expectPeerProcStart:f.verifiedPeerProcStart
        },storageV5:n
      }).catch((b)=>t(`[uds-messaging] hold-receipt send failed to ${Bf(S)}: ${TB(String(b))}`))
    }),t(`[uds-messaging] Listening: ${e}`,{
      level:"info"
    }),t(`[uds-messaging] Inject messages (auth line ${c().authRequired?"REQUIRED":"optional"} here): { echo '{"type":"auth","token":"'"$CLAUDE_CODE_MESSAGING_TOKEN"'"}'; echo '{"type":"user","message":{"role":"user","content":"hello"}}'; } | socat - UNIX-CONNECT:${e}`,{
      level:"info"
    }),t(`[uds-messaging] Connect when the data is ready (e.g. out=$(cmd); printf '%s\\n' "$out" | ${"nc -N -U"} "$CLAUDE_CODE_MESSAGING_SOCKET" \u2014 or the socat form above): a connection that sends no complete line within ${c().firstLineDeadlineMs} ms is closed`,{
      level:"info"
    }),c().lastStartFailureCause=void 0,nn(d,e,n,o)
  }catch(o){
    if(o instanceof _m)throw o;
    if(i.isExplicit){
      let g=v(o);
      if(s!==void 0)throw await B(d,e,n,{
        settleHeld:!1
      }),s(),W(),c().lastStartFailureCause="post_bind_setup_failed",new _m(`--messaging-socket-path: bound ${e} but could not finish setting the socket up (${g??String(o)}); the inbox was closed. The filesystem there may not support socket permissions \u2014 choose another directory.`);
      H(),W();
      let E=g==="ENAMETOOLONG"?"the path is too long for a Unix socket (max ~104 bytes); choose a shorter one":g==="EADDRINUSE"?"something already exists at that path and could not be replaced; remove it or choose another path":g==="EACCES"||g==="EPERM"?"permission denied in that directory":"the socket could not be created there";
      throw new _m(`--messaging-socket-path: cannot bind at ${e} (${g??String(o)}): ${E}.`)
    }if(s!==void 0)await B(d,e,n,{
      settleHeld:!1
    }),s(),c().lastStartFailureCause="post_bind_setup_failed";
    if(v(o)==="ENAMETOOLONG")t(`[uds-messaging] Socket path too long (${e.length} bytes, max ~104): ${e}. Try a shorter --messaging-socket-path, or set CLAUDE_CODE_TMPDIR or $XDG_RUNTIME_DIR to a shorter directory.`,{
      level:"error"
    });
    else t(`[uds-messaging] Failed to start: ${o}`,{
      level:"error"
    });
    H(),W();
    return
  }
}function pn(e){
  switch(e){
    case"held":return"Your message is held for the recipient user's approval before it reaches their Claude session (permission-mode parity).";
    case"denied":return"The recipient user declined your message; it was not delivered to their Claude session.";
    case"expired":return"Your held message expired without approval and was not delivered to the recipient's Claude session.";
    case"delivered":return"Your previously-held message was approved and released to the recipient's Claude session.";
    case"refused":return"The recipient session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them); your message was not delivered to its Claude.";
    case"dropped":return"The recipient's session dropped your message at its inbox (rate limit, duplicate, relay loop, or full queue); it was not delivered and will not be."
  }
}function gn(){
  let e=f9r();
  return e===void 0?{
  }:{
    from_mode:e
  }
}function f9r(){
  if(!E7e())return;
  let e=ti().inbound.getCurrentMode;
  if(e)try{
    return T7e(e())
  }catch{
    return
  }let n=ti().inbound.modeAtUnwire;
  return n!==void 0?T7e(n):void 0
}function Ce(e){
  return aLo(e)?e:void 0
}function ce(e,n,i){
  return ye({
    selfSentAncestry:n,verifiedPeerPid:e,childTokenPresented:i==="child",needsVerdict:unr(),platform:O()
  })
}function hn(){
  if(!process.listeners("exit").includes(m9r))process.on("exit",m9r)
}function m9r(){
  try{
    let e=c().activeKeyFile;
    if(e===void 0)return;
    Ge(e)
  }catch{
  }
} export{
  Pqo,Oqo,oEn,sEn,Hqo,iEn,Mqo,aEn,Dqo,W1o,p9r,Lqo,G1o,z1o,f9r,m9r
};