// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
// Version: 2.1.283
import{
  y,c
}from"/$bunfs/root/chunk-vyyazxfq.js";
import{
  I,v,Vg
}from"/$bunfs/root/chunk-ern0s5ks.js";
import{
  Q
}from"/$bunfs/root/chunk-jxwbd5gq.js";
import{
  rl,nM,Wi,Yi,G_e,Ljt,ns,oM,nI,nm,_N
}from"/$bunfs/root/chunk-yqm14hey.js";
import{
  go
}from"/$bunfs/root/chunk-s1pmhfks.js";
import{
  He
}from"/$bunfs/root/chunk-2j44ssk9.js";
import{
  Lt,qe,Zd,hm,mp,L_,$de,jmt,hjt,Fz
}from"/$bunfs/root/chunk-nvht7ckf.js";
import{
  N
}from"/$bunfs/root/chunk-8nz62976.js";
import{
  i
}from"/$bunfs/root/chunk-ab7mw5d9.js";
import{
  p
}from"/$bunfs/root/chunk-d09a8ccq.js";
import{
  b,J,Fh,oN,QGr,pf,ph,t
}from"/$bunfs/root/chunk-zkn0228z.js";
import{
  Dv,z1r
}from"/$bunfs/root/chunk-379zyrv7.js";
import{
  d,O
}from"/$bunfs/root/chunk-fmsbxtrp.js";
import{
  oR,ts,An
}from"/$bunfs/root/chunk-797phdpb.js";
import{
  f
}from"/$bunfs/root/chunk-bnk68ax9.js";
import{
  Ye
}from"/$bunfs/root/chunk-3xbb0kgg.js";
import{
  Si,mo,oA,sA,nFe
}from"/$bunfs/root/chunk-t6pwageh.js";
import{
  C6n
}from"/$bunfs/root/chunk-m8ebe51k.js";
import{
  gu
}from"/$bunfs/root/chunk-8w2y72gy.js";
import{
  jn,Re
}from"/$bunfs/root/chunk-qbkceaaj.js";
import{
  Ui
}from"/$bunfs/root/chunk-sctj0cwn.js";
import{
  he,Je
}from"/$bunfs/root/chunk-ckctvm5v.js";
import{
  ZCe
}from"/$bunfs/root/chunk-x5vr5vwm.js";
import{
  qt
}from"/$bunfs/root/chunk-0grnxhq4.js";
import{
  _d,D$,X0t,Pg
}from"/$bunfs/root/chunk-dqs077dg.js";
import{
  Mb,SG,Wan,fNe,qTe,g0t,Ec,np,RC
}from"/$bunfs/root/chunk-d310mfjt.js";
import{
  NG
}from"/$bunfs/root/chunk-8h22rhhd.js";
import{
  ql
}from"/$bunfs/root/chunk-75tfzg1z.js";
import{
  v8,LCt,bp,Q4,ou,PT
}from"/$bunfs/root/chunk-csayct82.js";
import{
  vV
}from"/$bunfs/root/chunk-5t3x93y6.js";
import{
  ww,aNe,ee
}from"/$bunfs/root/chunk-w6cz7xwh.js";
import{
  Pn
}from"/$bunfs/root/chunk-atffzb0c.js";
import{
  Ir
}from"/$bunfs/root/chunk-mxz6ht5b.js";
import{
  tpe
}from"/$bunfs/root/chunk-04bxndp1.js";
import{
  gM,dQ,Sh
}from"/$bunfs/root/chunk-rvdybe0q.js";
import{
  vOe
}from"/$bunfs/root/chunk-jcbpw1tz.js";
import{
  Dyt,lje
}from"/$bunfs/root/chunk-gwambpp6.js";
import{
  FRn,BRn,WRn,Ddr,j6t,GRn,awe
}from"/$bunfs/root/chunk-wczr02c0.js";
import{
  bWe
}from"/$bunfs/root/chunk-9neayp4m.js";
import{
  epe,uM
}from"/$bunfs/root/chunk-qe4hmxm9.js";
import{
  dO
}from"/$bunfs/root/chunk-4b86xm4h.js";
import{
  hGe,VSe,mvt,yGe
}from"/$bunfs/root/chunk-vg9vxhk0.js";
import{
  SGe,ACn,yvt
}from"/$bunfs/root/chunk-ewqxpq7k.js";
import{
  DFn
}from"/$bunfs/root/chunk-we3dq8fh.js";
import{
  UEe
}from"/$bunfs/root/chunk-gcxb5fm2.js";
import{
  qi
}from"/$bunfs/root/chunk-y4w72e4k.js";
import{
  nX,ly
}from"/$bunfs/root/chunk-skc0kcp7.js";
import{
  Tw
}from"/$bunfs/root/chunk-a64vqm80.js";
import{
  wF
}from"/$bunfs/root/chunk-tp36n59y.js";
import{
  B
}from"/$bunfs/root/chunk-153dnzje.js";
import{
  rt
}from"/$bunfs/root/chunk-nwpc1c89.js";
import{
  rr,de,fn,ho,Pc,Xn,lt,Ku,Bl,hVo
}from"/$bunfs/root/chunk-hn75r78z.js";
import{
  createHash as De,randomBytes as Se
}from"crypto";
import{
  constants as H
}from"fs";
import{
  copyFile as Ae,link as be,mkdir as fe,readdir as Ne,readFile as ve,realpath as j,rm as $e,rmdir as We,stat as Te,symlink as _e,unlink as D,lstat as W,readlink as Pe,open as ne
}from"fs/promises";
import{
  basename as K,dirname as V,isAbsolute as oe,join as z,relative as Fe,sep as ce
}from"path";
var ije=120000,U1o=60000,xZn=4000,je=250,re=/^[\w-]+$/;
function ie(e){
  let n=()=>[...e(),...[]],r=(o)=>{
    let s=Wi(o)?G_e(o):null;
    return s===null?null:Ljt(s)
  };
  return de().transform((o,s)=>{
    let l=(A)=>(s.addIssue({
      code:rr.custom,message:A
    }),hVo),a,u=()=>{
      if(a===void 0){
        let A=n(),m=A.map(nm).filter((w)=>w!==null);a={
          allowed:m,anchor:[...A,...m]
        }
      }return a
    };if(nI(o))return l(`adopt path is remote UNC: ${o}`);let g=oM(o);if(nM(g)||_N(g)||g!==o&&/[. ](?:[\\/]|$)/.test(g))return l(`adopt path is a Windows device-namespace spelling (\\\\?\\, \\\\.\\ or \\??\\) other than a plain \\\\?\\<drive>:\\ path: ${o}`);if(o=g,!oe(o)||rl(o))return l(`adopt path is not an absolute, dot-free spelling: ${o}`);let k=r(o),h=k!==null&&k.startsWith("/net/")?u().anchor.filter((A)=>r(A)===k):[];if(k!==null&&h.length===0)return l(k.startsWith("/net/")?`adopt path is on an automount host (or map) none of the allowed roots live on: ${o}`:`adopt path is under the macOS /Network/Servers automount directory, refused regardless of the allowed roots: ${o}`);let _=pf(ph,o,h.length>0?{
      anchors:h,unreadableAncestry:"unverified",surfaceNetworkRaw:!0
    }:void 0);if(_===Fh)return l(`adopt path runs through a directory that could not be examined or a symlink chain too long to follow: ${o}`);if(_!==void 0)return l(`adopt path traverses symlink/junction to remote UNC: ${_}`);let T=nm(o);if(T===null)return l(`adopt path unresolvable: ${o}`);let R=u().allowed;if(R.length===0)return l("adopt path roots unresolvable");if(!R.some((A)=>{
      let m=Fe(A,T);return m===""||!m.startsWith("..")&&!oe(m)
    }))return l(`adopt path outside allowed roots: ${T}`);return T
  })
}function Be(){
  return[RC()]
}function Le(e){
  return lt({
    taskId:de().regex(re),pid:fn().int().positive(),procStart:de().optional(),startTimeTicks:fn().int().optional(),command:de().transform((n)=>Q4(n)??""),description:de().transform((n)=>Q4(n)??""),outputPath:ie(e),lastReportedTotalLines:fn().int(),toolUseId:Pc().transform(UEe).optional(),kind:Bl(["bash","monitor"]).optional(),agentId:de().regex(re).optional()
  })
}var Ue=f(()=>Le(Be)),me=1e5,ze=f(()=>lt({
  id:de(),cron:de(),prompt:de(),createdAt:fn(),recurring:ho().optional(),agentId:de().optional(),kind:Ku("loop").optional(),scheduledFor:fn().optional(),reason:de().transform((e)=>Q4(e)).optional(),keepalive:Ku(!0).optional()
})),Ve=f(()=>lt({
  taskId:de().regex(re),workflowRunId:de().regex(/^wf_[a-z0-9-]{6,}$/),scriptPath:de(),scriptSha256:de().regex(/^[0-9a-f]{64}$/).optional(),argsJson:de().optional(),description:de().transform((e)=>Q4(e)??""),startTime:fn().optional(),transcriptDir:ie(()=>[_d()])
})),Ge=f(()=>lt({
  agentId:de().regex(re),agentType:de().optional(),description:de().transform((e)=>Q4(e)).optional(),toolUseId:Pc().transform(UEe).optional(),spawnDepth:fn().int().optional(),startTime:fn().optional(),transcriptPath:ie(()=>[_d()]).optional(),parentAgentId:de().regex(re).optional(),forkedSkillName:de().min(1).max(256).optional()
})),Ke=f(()=>lt({
  slug:de().uuid(),title:de().min(1).max(256).optional(),writtenAtMs:fn().finite().optional(),unattendedReplies:fn().int().min(0).max(yGe).optional()
}));
function Ee(e=Ue()){
  return lt({
    writtenAtMs:fn(),origin:Bl(["background","exit"]).optional(),shells:Xn(e),cron:Xn(ze()),loopWakeFires:fn().int().nonnegative().optional(),agents:Xn(Ge()).optional(),workflows:Xn(Ve()).optional(),frameLive:Xn(Ke()).optional(),prefill:lt({
      text:de(),boundaryUuid:de().optional()
    }).optional()
  })
}var Me=f(()=>Ee());
function Ie(e){
  let n=Array.isArray(e)?e:[e];
  return Ee(Le(()=>[RC(),...n]))
}var le=67108864;
async function Fwn(e,n){
  let r=await e.shellCommand?.detach?.();
  if(r===void 0)return null;
  let o=e.shellCommand.taskOutput.path,s=n?.rerootOutputsTo;
  if(s!==void 0){
    let l=async(u)=>{
      t(`[adopt] dropping shell ${e.id} from the handoff (${u})`,{
        level:"error"
      });
      try{
        await e.shellCommand?.kill?.()
      }catch{
      }return null
    },a=!1;
    try{
      if(ns(o)||Yi(o))throw Error("network-spelled output path");
      let u=pf(ph,o);
      if(u===Fh)throw Error("output path has a symlink chain too long to vet");
      if(u!==void 0)throw Error("output path traverses a junction to remote UNC");
      if((await W(o)).isSymbolicLink()){
        let T=await Pe(o);
        if(ns(T)||Yi(T))throw Error("network-spelled symlink target");
        let R=oe(T)?T:z(V(o),T);
        if(ns(R)||Yi(R))throw Error("network-spelled symlink hop");
        let F=pf(ph,R);
        if(F===Fh)throw Error("symlink target has a symlink chain too long to vet");
        if(F!==void 0)throw Error("symlink target traverses a junction to remote UNC");
        if((await W(R)).isSymbolicLink())throw Error("multi-hop symlink chain")
      }let k=await j(o),h=await W(k);
      a=!0;
      let _=await j(s).catch(()=>s);
      if(!k.startsWith(_+ce)){
        if(!(await Promise.all([np(),...[]].map((w)=>j(w).catch(()=>null)))).filter((w)=>w!==null).some((w)=>k.startsWith(w+ce)))return await l("its output resolves outside the task-output tree");
        let F=z(s,"rerooted",`${e.id}.output`),A;
        try{
          A=await ly(F,[F],{
            createParents:!0,leaf:"replace"
          })
        }catch{
          return await l("reroot directory not trustworthy")
        }let m=A.ioPath;
        try{
          if(!h.isFile())return await l("gate target is not a regular file");
          if(h.nlink!==1)return await l("gate target has another name");
          let w=await ne(k,O()==="windows"?"r":H.O_RDONLY|(H.O_NONBLOCK??0)|gu);
          try{
            let S=await w.stat();
            if(!S.isFile()||S.nlink!==1||S.dev!==h.dev||S.ino!==h.ino)return await l("handle identity mismatch");
            {
              if(await A.recheckBeforeWrite(),await D(m).catch(()=>{
              }),S.size>le)return await l("over-cap escaping output");
              let L;
              try{
                await A.recheckBeforeWrite(),L=O()==="windows"?await ne(m,"wx"):await nX(m,H.O_WRONLY|H.O_CREAT|H.O_EXCL|H.O_NOFOLLOW,O())
              }catch{
                return await l("reroot destination not creatable")
              }try{
                let x=0,P=Buffer.allocUnsafe(65536);
                while(x<le){
                  let{
                    bytesRead:E
                  }=await w.read(P,0,Math.min(P.length,le-x),x);
                  if(E===0)break;
                  let M=0;
                  while(M<E){
                    let{
                      bytesWritten:G
                    }=await L.write(P,M,E-M);
                    M+=G
                  }x+=E
                }
              }finally{
                await L.close()
              }o=F
            }
          }finally{
            await w.close()
          }
        }finally{
          await A.close()
        }
      }
    }catch{
      if(a)return await l("reroot failed after the gate")
    }
  }return{
    taskId:e.id,pid:r,procStart:await ZCe(r),startTimeTicks:await Dyt(r)??void 0,command:e.command,description:e.description,outputPath:o,lastReportedTotalLines:e.lastReportedTotalLines,toolUseId:e.toolUseId,kind:e.kind,agentId:e.agentId
  }
}async function Uwn(e,n={
}){
  let r=n.derivedTranscriptPath??Pg(go(e.agentId));
  return{
    agentId:e.agentId,agentType:e.agentType,description:e.description,toolUseId:e.toolUseId,spawnDepth:e.spawnDepth,startTime:e.startTime,transcriptPath:await j(r).catch(()=>{
      return
    }),parentAgentId:e.parentAgentId,forkedSkillName:e.forkedSkillName
  }
}async function Bwn(e,n={
}){
  let r=n.derivedTranscriptDir??dO(e.workflowRunId);
  return{
    taskId:e.id,workflowRunId:e.workflowRunId,scriptPath:e.scriptPath,scriptSha256:e.script?De("sha256").update(e.script).digest("hex"):void 0,argsJson:e.args!==void 0?b(e.args):void 0,description:e.description,startTime:e.startTime,transcriptDir:await j(r).catch(()=>r)
  }
}function Pj(e){
  return epe()&&dQ(e)&&e.frameLive!==void 0
}function zre(e){
  let n=new Set;
  if(!epe())return n;
  for(let r of Object.values(e))if(Pj(r)&&r.frameLive!==void 0)n.add(r.frameLive.slug);
  for(let r of hGe())n.add(r);
  for(let r of VSe())n.add(r);
  return n
}function h2t(e){
  let{
    supervisors:n,bootingWiredArms:r
  }=ee().live,o=VSe(),s=[],l=Date.now();
  for(let a of zre(e)){
    let u=n.get(a),g=o.has(a)?r.get(a):void 0;
    if(u===void 0&&g===void 0)continue;
    let k=g?.title??u?.autoReactWiring?.title,h=k!==void 0&&k.length>=1&&k.length<=256;
    s.push({
      slug:a,writtenAtMs:l,...h&&{
        title:k
      }
    })
  }return s
}async function y2t(e,n){
  let r=Yz(e),o=Object.values(e).filter((m)=>zwn(m,r)),s=Object.values(e).filter((m)=>Vwn(m,r)),l=Object.values(e).filter((m)=>w2t(m,r)),a=L_().filter((m)=>Pbe(m,r));
  if(o.length===0&&s.length===0&&l.length===0&&a.length===0&&h2t(e).length===0)return null;
  let u=(await Promise.all(o.map((m)=>Fwn(m,{
    rerootOutputsTo:RC()
  })))).filter((m)=>m!==null),g=await Promise.all(s.map((m)=>Uwn(m))),k=await Promise.all(l.map((m)=>Bwn(m))),h=h2t(e),_=new Set(h.map((m)=>m.slug)),T=Object.values(e).filter((m)=>Pj(m)&&m.frameLive!==void 0&&_.has(m.frameLive.slug)).map((m)=>m.id);
  if(u.length===0&&g.length===0&&k.length===0&&a.length===0&&h.length===0)return null;
  let R=!1,F=!1,A=(m)=>{
    if(F)return;
    F=!0,vOe(_),mvt(_);
    let w=new Set(T);
    if(_.size>0){
      for(let S of Object.values(m.all()))if(gM(S)&&S.status==="running"&&S.frameLive!==void 0&&_.has(S.frameLive.slug))w.add(S.id)
    }for(let S of w)Sh(S,m,{
      quiet:!0
    })
  };
  return{
    payload:{
      writtenAtMs:Date.now(),shells:u,cron:a.map((m)=>({
        id:m.id,cron:m.cron,prompt:m.prompt,createdAt:m.createdAt,recurring:m.recurring,agentId:m.agentId,kind:m.kind,scheduledFor:m.scheduledFor,reason:m.reason,keepalive:m.keepalive
      })),...jmt()>0&&{
        loopWakeFires:jmt()
      },agents:g,workflows:k,...h.length>0&&{
        frameLive:h
      }
    },checkpointAgents:async(m)=>{
      for(let w of l)w.abortController?.abort(ql("background")),tpe(w.id,m);
      if(g.length===0)return;
      for(let w of u)if(w.agentId!==void 0)m.remove(w.taskId);
      for(let w of s)w.abortController.abort(ql("background"));
      await Dv(),await ou().catch((w)=>{
        p("task_local_agent","adopt_checkpoint_flush_failed"),t(`[adopt] checkpoint flush: ${w}`,{
          level:"warn"
        })
      })
    },stopCarriedWatches:A,disown:(m)=>{
      A(m);
      for(let w of u)m.remove(w.taskId);
      for(let w of g)m.remove(w.agentId);
      for(let w of k)m.remove(w.taskId);
      if(a.length>0)Fz(a.map((w)=>w.id))
    },abandon:()=>{
      if(R)return;
      R=!0;
      for(let m of o)try{
        m.shellCommand?.kill()
      }catch(w){
        t(`[adopt] abandon ${m.id}: ${w}`,{
          level:"warn"
        })
      }for(let m of s){
        let w=`Background agent "${qt(m.description)}" was checkpointed for the background fork but the fork failed to spawn; the agent was not resumed.`;
        te(m.agentId,w,n)
      }if(s.length>0)p("task_local_agent","adopt_spawn_failed");
      for(let m of l){
        let w=`Background workflow "${qt(m.description)}" was checkpointed for the background fork but the fork failed to spawn; it was not resumed. To resume manually: Workflow({scriptPath: '${qt(m.scriptPath??"")}', resumeFromRunId: '${qt(m.workflowRunId??"")}'}).`;
        te(m.id,w,n)
      }if(l.length>0)p("task_local_workflow","adopt_spawn_failed");
      if(F){
        for(let m of T)te(m,"The background session didn't start, so automatic replies to Artifact comments stopped. Publish the Artifact again to turn them back on.",n);
        if(h.length>0)p("artifact_live_subscribe","adopt_spawn_failed")
      }
    }
  }
}function jwn(e){
  let n=new Map;
  for(let r of e)for(let o of r.entries){
    let s={
      ...o,writtenAtMs:o.writtenAtMs??r.fallbackBasis
    },l=n.get(o.slug),a=Math.min((l?.unattendedReplies??0)+(o.unattendedReplies??0),yGe),u=l===void 0||s.writtenAtMs>(l.writtenAtMs??0)?s:l;
    n.set(o.slug,a>0?{
      ...u,unattendedReplies:a
    }:u)
  }if(n.size>ww)p("artifact_live_subscribe","merged_consent_capped");
  return[...n.values()].sort((r,o)=>(o.writtenAtMs??0)-(r.writtenAtMs??0)).slice(0,aNe)
}function Xe(e,n){
  let r=(o,s,l)=>[...o,...s].filter((a,u,g)=>g.findIndex((k)=>l(k)===l(a))===u);
  return{
    writtenAtMs:n.writtenAtMs,origin:n.origin??e.origin,shells:r(e.shells,n.shells,(o)=>o.pid),cron:r(e.cron,n.cron,(o)=>o.id),...(n.loopWakeFires??e.loopWakeFires)!==void 0&&{
      loopWakeFires:n.loopWakeFires??e.loopWakeFires
    },agents:r(e.agents??[],n.agents??[],(o)=>o.agentId),workflows:r(e.workflows??[],n.workflows??[],(o)=>o.taskId),...((e.frameLive?.length??0)>0||(n.frameLive?.length??0)>0)&&{
      frameLive:jwn([{
        entries:e.frameLive??[],fallbackBasis:e.writtenAtMs
      },{
        entries:n.frameLive??[],fallbackBasis:n.writtenAtMs
      }])
    },prefill:n.prefill??e.prefill
  }
}async function Qe(e,n){
  let r=await e.read([Re.job(n,["adopt.json"])]);
  if(!r.ok)return t(`[adopt] v5 merge read refused: ${rt(r.error)}`),null;
  let o=r.value.items[0];
  if(!o.found)return null;
  return Buffer.from(o.value).toString("utf8")
}async function aje(e,n,r={
},o){
  let s=z(e,"adopt.json"),l=K(e),a=N()&&o!==void 0&&jn(l)&&e===Ir(l)?o:void 0,u=n;
  try{
    let g=a?await Qe(a,l):await ve(s,"utf-8");
    if(g!==null&&g.length<=1e6){
      let h=(r.mergeShellOutputRoot!==void 0?Ie(r.mergeShellOutputRoot):Me()).safeParse(J(g));
      if(h.success){
        if(h.data.shells.length+(h.data.cron?.length??0)+(h.data.agents?.length??0)+(h.data.workflows?.length??0)+(h.data.frameLive?.length??0)<=256)u=Xe(h.data,n)
      }
    }
  }catch{
  }if(a){
    let g=await a.write(Re.job(l,["adopt.json"]),b(u),{
      publishDiscipline:"atomic",mode:438&~process.umask(),parent:r.parent??"mustExist"
    });
    if(!g.ok)throw Object.assign(new I(`adopt.json v5 write failed: ${rt(g.error)}`,"adopt.json v5 write failed"),"telemetryCode"in g.error&&g.error.telemetryCode!==void 0?{
      code:g.error.telemetryCode
    }:{
    });
    return
  }await An(s,b(u))
}async function IZn(e,n={
}){
  if(!e)return null;
  let r=z(e,"adopt.json"),o=`${r}.${process.pid}`,s=Date.now()+(n.waitMs??0),l=!1;
  for(;;)try{
    l=await ts(r,o);
    break
  }catch(g){
    let k=v(g);
    if(k==="ENOENT"){
      if(Date.now()<s){
        await Q(je);
        continue
      }return i("tengu_adopt_claim",{
        result:y("enoent")
      }),null
    }return t(`[adopt] rename failed: ${g}`,{
      level:"warn"
    }),i("tengu_adopt_claim",{
      result:k!==void 0&&oR.has(k)?y("ebusy_gave_up"):Vg(g)
    }),null
  }let a=Date.now(),u=l?y("ebusy_retry"):y("ok");
  try{
    let g=await ve(o,"utf-8"),h=(n.extraShellOutputRoot!==void 0?Ie(n.extraShellOutputRoot):Me()).safeParse(JSON.parse(g));
    if(!h.success)return t(`[adopt] schema rejected: ${h.error.message}`,{
      level:"warn"
    }),i("tengu_adopt_claim",{
      result:y("schema_rejected")
    }),null;
    let _=a-h.data.writtenAtMs;
    if(h.data.origin!=="exit"&&_>ije){
      t(`[adopt] stale (age ${_}ms)`,{
        level:"warn"
      });
      let T=h.data.frameLive??[];
      if(T.length===0)return i("tengu_adopt_claim",{
        result:y("stale")
      }),null;
      return i("tengu_adopt_claim",{
        result:y("stale"),frame_live_stale:y("true")
      }),p("artifact_live_subscribe","carried_consent_stale_dropped"),{
        writtenAtMs:h.data.writtenAtMs,...h.data.origin!==void 0&&{
          origin:h.data.origin
        },shells:[],cron:[],frameLive:T.map((R)=>({
          ...R,writtenAtMs:R.writtenAtMs??h.data.writtenAtMs,stale:!0
        }))
      }
    }if((h.data.frameLive?.length??0)>0){
      let T=h.data.frameLive.map((F)=>{
        let A=F.writtenAtMs??h.data.writtenAtMs,m=a-A;return m>=-U1o&&m<=ije?{
          ...F,writtenAtMs:A
        }:{
          ...F,writtenAtMs:A,stale:!0
        }
      }),R=B(T,(F)=>("stale"in F));
      if(R>0)t(`[adopt] ${R}/${T.length} frameLive entries marked stale`,{
        level:"warn"
      });
      return i("tengu_adopt_claim",{
        result:u,...R>0&&{
          frame_live_stale:y("true")
        }
      }),Object.assign(h.data,{
        frameLive:T
      })
    }return i("tengu_adopt_claim",{
      result:u
    }),h.data
  }catch(g){
    return t(`[adopt] read/parse failed: ${g}`,{
      level:"warn"
    }),i("tengu_adopt_claim",{
      result:y("parse_failed")
    }),null
  }finally{
    await D(o).catch(()=>{
    })
  }
}function PZn(e,n,r,o){
  let s=v8();
  if(n.length===0&&r.length===0){
    s.unresumedAdopt.delete(e);
    return
  }s.unresumedAdopt.set(e,{
    agents:n,workflows:r,owner:o
  })
}function OZn(e,n){
  if(v8().unresumedAdopt.get(e)?.owner!==n)return{
    agents:[],workflows:[]
  };
  return Wwn(e)
}function Wwn(e){
  let n=v8(),r=n.unresumedAdopt.get(e);
  return n.unresumedAdopt.delete(e),{
    agents:r?.agents??[],workflows:r?.workflows??[]
  }
}function HZn(e,n,r){
  let o=v8();
  if(n.length===0){
    o.unresumedFrameLive.delete(e);
    return
  }o.unresumedFrameLive.set(e,{
    entries:n.map(({
      stale:s,...l
    })=>l),owner:r
  })
}function MZn(e,n){
  if(v8().unresumedFrameLive.get(e)?.owner!==n)return[];
  return _2t(e)
}function _2t(e){
  let n=v8(),r=n.unresumedFrameLive.get(e);
  return n.unresumedFrameLive.delete(e),r?.entries??[]
}function DZn(e,n,r){
  let o=v8(),s=o.unresumedFrameLive.get(e);
  if(n.length===0||s!==void 0&&s.owner!==r)return;
  o.unresumedFrameLive.set(e,{
    entries:[...n],owner:r
  })
}function LZn(e,n,r){
  let o=v8(),s=o.unresumedFrameLive.get(e);
  if(s===void 0||s.owner!==r)return;
  let l=s.entries.filter((a)=>a.slug!==n);
  if(l.length>0)o.unresumedFrameLive.set(e,{
    entries:l,owner:r
  });
  else o.unresumedFrameLive.delete(e)
}function NZn(e,n){
  if(n.length>0)v8().exitRetryFrameLive.set(e,[...n])
}function $Zn(e){
  if(e===void 0)return[];
  let n=v8(),r=n.exitRetryFrameLive.get(e)??[];
  return n.exitRetryFrameLive.delete(e),r
}var Ze=new Set(["EXDEV","EPERM","ENOTSUP","EOPNOTSUPP","ENOSYS","EMLINK"]),et=1048576,Oe=".adopt-relink.";
function tt(e){
  return`${e}${Oe}${process.pid}.${Date.now()}.${Se(4).toString("hex")}`
}async function nt(e,n,r,o){
  let s;
  try{
    await o(e,n),s="UNVERIFIED"
  }catch(a){
    let u=v(a);
    if(u===void 0||!Ze.has(u))throw a;
    s=u
  }if(s==="UNVERIFIED"){
    let a=await W(n);
    if(a.isFile()&&a.dev===r.dev&&a.ino===r.ino)return{
      method:"hardlink",identity:r
    };
    await D(n)
  }let l=await ot(e,n,r);
  return{
    method:"copy",fallbackCode:s,identity:l
  }
}async function ot(e,n,r){
  let o=await ne(e,H.O_RDONLY|gu);
  try{
    let s=await o.stat();
    if(!s.isFile()||s.dev!==r.dev||s.ino!==r.ino)throw Object.assign(Error("adopted file copy source is not the validated inode"),{
      code:"ADOPT_IDENTITY_MISMATCH"
    });
    let l=await ne(n,"wx",C6n),a=!1;
    try{
      let u=Buffer.allocUnsafe(et);
      for(;;){
        let{
          bytesRead:h
        }=await o.read(u,0,u.length,null);
        if(h===0)break;
        let _=0;
        while(_<h){
          let{
            bytesWritten:T
          }=await l.write(u,_,h-_);
          if(T===0)throw Object.assign(Error("adopted file copy made no progress"),{
            code:"ADOPT_COPY_STALLED"
          });
          _+=T
        }
      }let{
        dev:g,ino:k
      }=await l.stat();
      return await l.utimes(s.atime,s.mtime).catch((h)=>{
        t(`[adopt] copied file keeps fresh timestamps (${v(h)??"error"})`,{
          level:"warn"
        })
      }),await l.close(),a=!0,{
        dev:g,ino:k
      }
    }finally{
      if(!a)await l.close().catch(()=>{
      }),await D(n).catch(()=>{
      })
    }
  }finally{
    await o.close().catch(()=>{
    })
  }
}async function it(e,n,r){
  let o;
  try{
    o=await W(n)
  }catch(s){
    if(v(s)!=="ENOENT")throw s
  }if(o!==void 0&&!o.isSymbolicLink()){
    if(!o.isFile())throw Object.assign(Error("adopted agent name is held by a non-file entry"),{
      code:"ADOPT_NAME_NOT_FILE"
    });
    if(r)return"kept"
  }try{
    await ts(e,n)
  }catch(s){
    if(o===void 0||v(s)!=="EEXIST")throw s;
    await D(n),await ts(e,n)
  }return o===void 0?"created":"replaced"
}async function ue(e,n,r,o,s){
  if(s){
    let h=await W(e).catch(()=>{
      return
    });
    if(h!==void 0&&!h.isSymbolicLink()&&h.isFile())return{
      method:"kept",created:null
    }
  }let l=tt(e),a=await nt(n,l,r,o),u="kept";
  try{
    u=await it(l,e,s)
  }finally{
    await D(l).catch(()=>{
    })
  }let{
    identity:g,...k
  }=a;
  return u==="kept"?{
    method:"kept",created:null
  }:{
    ...k,created:u==="created"?g:null
  }
}async function FZn(e,{
  storageV5:n,linkFn:r=be
}={
}){
  if(n===void 0)return at(e);
  try{
    let o=await st(e,r);
    if(o.method!==void 0)i("tengu_adopt_link",{
      kind:y("agent"),method:c(o.method),fallback_code:Vg({
        code:o.fallbackCode
      })
    });
    return o
  }catch(o){
    throw i("tengu_adopt_link",{
      kind:y("agent"),method:c("fail"),error_code:Vg(o)
    }),o
  }
}async function at(e){
  if(!e.transcriptPath)return{
  };
  let n=Pg(go(e.agentId)),r=(a)=>a.replace(/\.jsonl$/,".meta.json");
  await Te(r(e.transcriptPath));
  let o=null,s,l=SGe(e.transcriptPath);
  if(e.forkedSkillName!==void 0){
    let a=await yvt(l);
    if(a.status!=="valid")throw new I(`adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${a.status})`,"adopted forked-skill scoping record unusable");
    if(a.scoping.skillName!==e.forkedSkillName)throw new I(`adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,"adopted forked-skill scoping identity mismatch");
    o={
      parent:l,fork:SGe(n)
    }
  }else{
    let a=await yvt(l);
    switch(a.status){
      case"absent":break;
      case"valid":o={
        parent:l,fork:SGe(n)
      },s=a.scoping.skillName;
      break;
      case"malformed":case"absent-but-marked":throw new I(`adopted agent ${e.agentId} has an unusable forked-skill scoping record (${a.status})`,"adopted forked-skill scoping record unusable")
    }
  }if(n===e.transcriptPath)return{
    forkedSkillNameFromSidecar:s
  };
  if(await j(n).catch(()=>{
    return
  })===e.transcriptPath)return{
    forkedSkillNameFromSidecar:s
  };
  if(await fe(V(n),{
    recursive:!0
  }),o)await D(o.fork.provenanceMarker).catch(()=>{
  }),await ACn(o.fork.provenanceMarker,e.forkedSkillName??s),await D(o.fork.scoping).catch(()=>{
  }),await Ae(o.parent.scoping,o.fork.scoping);
  for(let[a,u]of[[n,e.transcriptPath],[r(n),r(e.transcriptPath)]])await D(a).catch(()=>{
  }),await _e(u,a);
  return{
    forkedSkillNameFromSidecar:s
  }
}function q(e,n){
  return Object.assign(e,{
    code:n
  })
}async function st(e,n){
  if(!e.transcriptPath)return{
  };
  let r=Pg(go(e.agentId)),o=(A)=>A.replace(/\.jsonl$/,".meta.json");
  if(K(e.transcriptPath)!==K(r))throw q(new I(`adopted agent ${e.agentId} carrier names a transcript that is not agent-${e.agentId}.jsonl`,"adopted agent transcript path has the wrong leaf name"),"ADOPT_WRONG_LEAF");
  let[s,l]=await Promise.all([W(e.transcriptPath),W(o(e.transcriptPath))]);
  if(!s.isFile()||!l.isFile())throw q(new I(`adopted agent ${e.agentId} parent transcript or .meta.json is not a regular file`,"adopted agent parent file is not a regular file"),"ADOPT_PARENT_NOT_REGULAR");
  let a=null,u,g=SGe(e.transcriptPath);
  if(e.forkedSkillName!==void 0){
    let A=await yvt(g);
    if(A.status!=="valid")throw q(new I(`adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record is unusable (${A.status})`,"adopted forked-skill scoping record unusable"),"ADOPT_SCOPING_UNUSABLE");
    if(A.scoping.skillName!==e.forkedSkillName)throw q(new I(`adopted agent ${e.agentId} declares forked-skill ${e.forkedSkillName} but its scoping record names a different skill`,"adopted forked-skill scoping identity mismatch"),"ADOPT_SCOPING_MISMATCH");
    a={
      parent:g,fork:SGe(r)
    }
  }else{
    let A=await yvt(g);
    switch(A.status){
      case"absent":break;
      case"valid":a={
        parent:g,fork:SGe(r)
      },u=A.scoping.skillName;
      break;
      case"malformed":case"absent-but-marked":throw q(new I(`adopted agent ${e.agentId} has an unusable forked-skill scoping record (${A.status})`,"adopted forked-skill scoping record unusable"),"ADOPT_SCOPING_UNUSABLE")
    }
  }if(r===e.transcriptPath)return{
    forkedSkillNameFromSidecar:u,method:"noop"
  };
  let k=await j(V(r)).catch(()=>{
    return
  });
  if(k!==void 0&&z(k,K(r))===e.transcriptPath)return{
    forkedSkillNameFromSidecar:u,method:"noop"
  };
  if(await fe(V(r),{
    recursive:!0
  }),a)await D(a.fork.provenanceMarker).catch(()=>{
  }),await ACn(a.fork.provenanceMarker,e.forkedSkillName??u),await D(a.fork.scoping).catch(()=>{
  }),await Ae(a.parent.scoping,a.fork.scoping);
  let h=await W(r).catch(()=>{
    return
  }),_=h!==void 0&&(h.isFile()||h.isSymbolicLink()&&await j(r).catch(()=>{
    return
  })===e.transcriptPath),T=await ue(o(r),o(e.transcriptPath),l,n,_),R;
  try{
    R=await ue(r,e.transcriptPath,s,n,!0)
  }catch(A){
    if(T.created!==null){
      let m=T.created;
      await W(o(r)).then(async(w)=>{
        if(w.dev===m.dev&&w.ino===m.ino)await D(o(r))
      }).catch(()=>{
      })
    }throw A
  }let F=R.fallbackCode??T.fallbackCode;
  if(F!==void 0){
    let A=[...R.method==="copy"?["transcript"]:[],...T.method==="copy"?["meta"]:[]].join("+");
    t(`[adopt] agent ${e.agentId}: hard link impossible (${F}) \u2014 materialised a copy of ${A}`,{
      level:"warn"
    }),p("task_local_agent","adopt_link_fallback_copy")
  }return{
    forkedSkillNameFromSidecar:u,method:R.method,fallbackCode:F
  }
}var dt=/^agent-[\w-]+\.(?:jsonl|meta\.json)$/,ct=new RegExp("^agent-[\\w-]+\\.(?:jsonl|meta\\.json)"+Oe.replace(/[.]/g,"\\.")+"\\d+\\.(\\d+)\\.[0-9a-f]{8}$"),ut=900000,ft=64;
function xe(e,n){
  let r=Fe(e,n);
  if(r===""||r.startsWith("..")||oe(r))return null;
  let o=r.split(ce);
  if(o.length<3||o[2]!=="subagents")return null;
  return{
    session:z(o[0],o[1]),depth:o.length
  }
}async function UZn({
  storageV5:e,linkFn:n=be
}={
}){
  if(e===void 0)return;
  try{
    await pt(X0t(),n)
  }catch(r){
    if(v(r)!==void 0){
      t(`[adopt] relink sweep abandoned: ${r}`,{
        level:"warn"
      });
      return
    }d(r)
  }
}async function pt(e,n){
  let r;
  try{
    r=await Ne(e,{
      withFileTypes:!0
    })
  }catch{
    return
  }let o=Date.now(),s=[];
  for(let P of r){
    let E=ct.exec(P.name);
    if(E){
      if(Math.abs(o-Number(E[1]))>ut)await D(z(e,P.name)).catch(()=>{
      });
      continue
    }if(P.isSymbolicLink()&&dt.test(P.name))s.push(P.name)
  }if(s.length===0)return;
  let l=(P)=>P.replace(/\.(?:jsonl|meta\.json)$/,""),a=new Map;
  for(let P of s){
    let E=a.get(l(P))??{
    };
    if(P.endsWith(".jsonl"))E.transcript=P;
    else E.meta=P;
    a.set(l(P),E)
  }let u=[...a.entries()],g=u.length>1?Se(4).readUInt32BE()%u.length:0,k=[...u.slice(g),...u.slice(0,g)],[h,_]=await Promise.all([j(_d()).catch(()=>null),j(e).catch(()=>null)]);
  if(h===null||_===null)return;
  let T=xe(h,_);
  if(D$(V(V(e)))===void 0||T===null||T.depth!==3){
    t(`[adopt] relink sweep: ${s.length} symlinked name(s) left as is (session dir outside the transcript store)`,{
      level:"warn"
    });
    return
  }let R=T.session,F=0,A=0,m=0,w=0,S=[],L=(P)=>{
    if(P==="copy")A++;
    else F++
  },x=new Set;
  for(let[P,[E,M]]of k.entries()){
    let G=[M.transcript,M.meta].filter((U)=>U!==void 0);
    if(w+G.length>ft){
      m=k.slice(P).reduce((U,[,C])=>U+Number(!!C.transcript)+Number(!!C.meta),0),S.push(`${m} more (per-pass cap)`);
      break
    }w+=G.length;
    try{
      let U=`${E}.jsonl`,C=M.transcript!==void 0?await we(e,U,h,R):await kt(e,U);
      if(typeof C==="string"){
        for(let Y of G)S.push(`${Y} (${Y===M.meta&&M.transcript!==void 0?"transcript not convertible":C})`);
        continue
      }let se;
      if(M.meta!==void 0){
        let Y=C!==null&&C.gate.size===0?"meta beside an empty transcript":await we(e,M.meta,h,R,{
          besideDir:C===null?void 0:V(C.real)
        });
        if(typeof Y==="string"){
          for(let pe of G)S.push(`${pe} (${pe===M.meta?Y:"meta not convertible"})`);
          continue
        }se=Y
      }if(C!==null)L(await ye(C,n)),x.add(U);
      if(se!==void 0&&M.meta!==void 0)L(await ye(se,n)),x.add(M.meta)
    }catch(U){
      if(v(U)===void 0)d(U);
      for(let C of G)if(!x.has(C))S.push(`${C} (${v(U)??"error"})`)
    }
  }if(A>0)p("task_local_agent","adopt_link_fallback_copy");
  t(`[adopt] relink sweep: ${F} hard-linked, ${A} copied, ${S.length-(m>0?1:0)+m} left as is${S.length>0?` (${S.slice(0,5).join(", ")})`:""}`,{
    level:S.length>0||A>0?"warn":"debug"
  }),i("tengu_adopt_relink",{
    linked:F,copied:A,left:S.length-(m>0?1:0)+m
  })
}var Z=65536,mt=f(()=>lt({
  agentType:de()
})),gt=f(()=>lt({
  agentId:de()
}));
async function Ce(e,n,r){
  let o=await ne(e,H.O_RDONLY|gu);
  try{
    let s=await o.stat();
    if(s.dev!==n.dev||s.ino!==n.ino)return"target changed during the check";
    if(r.endsWith(".meta.json")){
      if(s.size>Z)return"meta too large";
      let g=ge((await ke(o)).toString("utf-8"));
      return mt().safeParse(g).success?void 0:"not an agent meta"
    }if(s.size===0)return;
    let l=r.slice(6,-6),a=await ke(o),u=a.toString("utf-8");
    if(a.length>=Z&&a.indexOf(10)===-1)return ht(u,l)?void 0:"no record naming this agent in the first 64 KiB";
    for(let g of u.split(`
`)){
      let k=ge(g);
      if(k===null)continue;
      let h=gt().safeParse(k);
      if(h.success&&h.data.agentId===l)return
    }return"no record naming this agent in the first 64 KiB"
  }finally{
    await o.close().catch(()=>{
    })
  }
}function ge(e){
  try{
    return J(e)
  }catch{
    return null
  }
}async function ke(e){
  let n=Buffer.allocUnsafe(Z),r=0;
  while(r<Z){
    let{
      bytesRead:o
    }=await e.read(n,r,Z-r,r);
    if(o===0)break;
    r+=o
  }return n.subarray(0,r)
}function ht(e,n){
  if(e[0]!=="{")return!1;
  let r=`"agentId":"${n}"`,o=0,s=!1,l=!1;
  for(let a=0;a<e.length;a++){
    let u=e[a];
    if(s){
      if(l)l=!1;
      else if(u==="\\")l=!0;
      else if(u==='"')s=!1;
      continue
    }if(u==="{"||u==="[")o++;
    else if(u==="}"||u==="]"){
      if(o--,o===0)return!1
    }else if(u==='"'){
      if(o===1&&e.startsWith(r,a)&&(e[a-1]==="{"||e[a-1]===","))return!0;
      s=!0
    }
  }return!1
}async function we(e,n,r,o,{
  besideDir:s
}={
}){
  let l=z(e,n),a=await Pe(l);
  if(!oe(a)||K(a)!==n||oN(a))return"unexpected target spelling";
  let u;
  try{
    u=await W(a)
  }catch(T){
    return`target ${v(T)??"unreadable"}`
  }if(!u.isFile())return u.isSymbolicLink()?"chained link":"non-regular target";
  let g=await j(a),k=xe(r,g);
  if(k===null||k.depth<4||K(g)!==n)return"outside the transcript store";
  if(k.session===o)return"this session's own file";
  if(s!==void 0&&V(g)!==s)return"not beside its transcript";
  let h=await W(g);
  if(!h.isFile()||h.dev!==u.dev||h.ino!==u.ino)return"target changed during the check";
  let _=await Ce(g,u,n);
  if(_!==void 0)return _;
  return{
    linkPath:l,real:g,gate:u
  }
}async function kt(e,n){
  let r=z(e,n),o;
  try{
    o=await W(r)
  }catch{
    return"meta without its transcript"
  }if(!o.isFile()||o.size===0)return"meta without its transcript";
  let s=await Ce(r,o,n);
  return s===void 0?null:`transcript ${s}`
}async function ye(e,n){
  return(await ue(e.linkPath,e.real,e.gate,n,!0)).method
}function BZn(e){
  return lje(e.pid,e.startTimeTicks,e.procStart)
}async function jZn(e){
  let n=dO(e.workflowRunId);
  if(n===e.transcriptDir)return;
  if(await j(n).catch(()=>{
    return
  })===e.transcriptDir)return;
  await Te(z(e.transcriptDir,"journal.jsonl")),await fe(V(n),{
    recursive:!0
  });
  try{
    await D(n)
  }catch(r){
    if(v(r)!=="ENOENT")try{
      await We(n)
    }catch(s){
      if(v(s)==="ENOTEMPTY")await $e(n,{
        recursive:!0,force:!0
      })
    }
  }await _e(e.transcriptDir,n,void 0)
}function b2t(e,n,r){
  let o=e.scriptPath!==void 0?` To resume manually: Workflow({scriptPath: '${qt(e.scriptPath)}', resumeFromRunId: '${qt(e.workflowRunId)}'}).`:"",s=`Background workflow "${qt(e.description)}" was checkpointed for the background fork but could not be resumed (${qt(n)}).${o}`;
  te(e.taskId,s,r)
}function te(e,n,r,o=qe()){
  r.enqueuePendingNotification({
    value:qi({
      taskId:qt(e),status:"failed",summary:n
    }),agentId:o,mode:"task-notification",skipAttachments:!0,priority:"next",taskId:e
  }),Si(e,"failed",{
    summary:n
  })
}function WZn(e){
  let n=ie(()=>[_d()]).safeParse(e);
  if(!n.success)throw new I(n.error.issues[0]?.message??"scriptPath rejected","adopt scriptPath rejected");
  return n.data
}function Gwn(e){
  return e.mcp.clientsInitialized===!0&&!e.mcp.clients.some((n)=>n.type==="pending")
}function GZn(e){
  let n=e.parentAgentId!==void 0,r=e.forkedSkillName!==void 0;
  return{
    emit:n||r,excludeFromReconcile:!n&&r
  }
}function S2t(e,n,r,o){
  let s=e.parentAgentId!==void 0&&Pn(r.get(e.parentAgentId))?go(e.parentAgentId):qe(),l=`Background agent "${qt(e.description??e.agentId)}" was checkpointed for the background fork but could not be resumed (${qt(n)}).`;
  te(e.agentId,l,o,s)
}function zZn(e,n){
  let r=new Set(L_().map((o)=>o.id));
  for(let o of e){
    if(o.prompt.length>me){
      p("task_local_agent","adopt_cron_prompt_too_long"),t(`[adopt] cron ${wF(o.id,64)} skipped: prompt is ${o.prompt.length} characters, over the ${me} limit`,{
        level:"warn"
      });
      continue
    }if(!r.has(o.id))$de(o),r.add(o.id)
  }for(let o=0;o<(n??0);o++)hjt()
}function Yz(e){
  let n=new Map;
  if(!epe())return n;
  let r=(a)=>Pn(a)?a.parentAgentId:("agentId"in a)?a.agentId:void 0,o=new Map;
  for(let a of Object.values(e)){
    if(a.status!=="running"&&a.status!=="pending"||Pn(a)&&a.forkWorker)continue;
    let u=r(a);
    if(u!==void 0){
      let g=o.get(u)??[];
      g.push(a),o.set(u,g)
    }
  }let s=(a)=>{
    if(Pn(a))return a.agentType!=="main-session"&&a.status==="running"&&a.isBackgrounded&&a.abortController!==void 0;
    if(bp(a))return a.kind!=="monitor"&&a.status==="running"&&a.isBackgrounded&&a.shellCommand!==null&&a.shellCommand.detach!==void 0;
    if(DFn(a))return a.status==="running"&&a.v2Run===void 0&&a.scriptPath!==void 0&&a.workflowRunId!==void 0&&a.abortController!==void 0;
    return!1
  },l=(a,u)=>{
    u.push(a.id);
    let g=s(a);
    for(let k of o.get(a.id)??[])g=l(k,u)&&g;
    return g
  };
  for(let a of Object.values(e)){
    if(!(Pn(a)?a.parentAgentId===void 0:bp(a)?a.agentId===void 0:DFn(a)))continue;
    let g=[],k=l(a,g);
    for(let h of g)n.set(h,k)
  }return n
}function zwn(e,n){
  return bp(e)&&(n.get(e.id)??!1)
}function Pbe(e,n){
  return epe()&&(e.agentId===void 0||(n.get(e.agentId)??!1))
}function Vwn(e,n){
  return Pn(e)&&(n.get(e.id)??!1)
}function w2t(e,n){
  return DFn(e)&&(n.get(e.id)??!1)
}function QIe(e,n){
  return n.get(e.id)??!1
}function IJe(e,n=Yz(e)){
  let r=zre(e);
  return B(Object.values(e),(o)=>QIe(o,n))+B(L_(),(o)=>Pbe(o,n))+r.size
}function PJe(e,n=Yz(e)){
  return uM(e).count-IJe(e,n)
}function ZIe(e,n=Yz(e)){
  let r=0,o=0,s=0;
  for(let l of Object.values(e)){
    if(!w2t(l,n))continue;
    let a=1/0;
    for(let u of l.workflowProgress)if(u.type==="workflow_agent"&&u.state==="error")a=Math.min(a,u.index);
    for(let u of l.workflowProgress){
      if(u.type!=="workflow_agent")continue;
      if(u.state==="done")if(u.index>a)s++;
      else o++;
      else if(u.state==="progress"||u.state==="start"&&!(u.queuedAt!==void 0&&u.startedAt===void 0))r++
    }
  }return{
    running:r,finished:o,rerun:s
  }
}function VZn(e,n=Yz(e)){
  return PJe(e,n)>0||zre(e).size>0||ZIe(e,n).running>0
}function OJe(e,n){
  let r=0;
  for(let o of zre(e))if(!n.has(o))r++;
  return r
}function qZn(e){
  return e.shells.length>0||(e.agents?.length??0)>0||(e.workflows?.length??0)>0||e.cron.length>0
}function v2t(e){
  return{
    adopted_shells:e?.shells.length??0,adopted_agents:e?.agents?.length??0,adopted_workflows:e?.workflows?.length??0,adopted_cron:e?.cron.length??0,adopted_frame_live:e?.frameLive?.length??0
  }
}function Pyt(e){
  return Zd((n,r,o)=>{
    if(!o)return;wt(o,e),i("tengu_refusal_fallback_latch_reset",{
      source:c(r),restored_to_explicit_override:o.restoredToExplicitOverride,model_scope:c(vV(o.fallbackModel))
    })
  })
}function b8r(e){
  return Zd((n,r,o)=>{
    if(o)e()
  })
}function wt(e,n){
  let r,o;
  if(n((s)=>{
    let l=e.overrideValue??e.forSessionValue??e.appStateModel,a=mo()?oA(l,s.fastMode):!!s.fastMode;return r=s.fastMode,o=a,s.mainLoopModel===e.appStateModel&&s.mainLoopModelForSession===e.forSessionValue&&a===!!s.fastMode?s:{
      ...s,mainLoopModel:e.appStateModel,mainLoopModelForSession:e.forSessionValue,fastMode:a
    }
  }),o!==void 0)sA(r,o);
  mp(e.overrideValue)
}import{
  resolve as yt
}from"path";
var KZn=new Lt(()=>He());
function Oyt(e,n,r,o,s){
  let l=Je();
  t(`Settings changed from ${n}, updating app state`),nFe();
  let a=SG();
  NG({
    userLayer:"retain"
  }),PT();
  let u=!1;
  if(r((g)=>{
    let k=LCt(g.toolPermissionContext,a);k=XZn(k,g.settings.permissions?.additionalDirectories,fNe(),n,s?.trustFlip===!0,s?.prevCwd,o);let h=YZn(k,a);if(k=h.context,u=h.exitedAutoMode,k.blockReadsOutsideWorkingDirectories!==!0&&qTe())k={
      ...k,blockReadsOutsideWorkingDirectories:!0
    },g0t();let _=bWe();return{
      ...g,settings:l,toolPermissionContext:k,...g.awaySummaryEnabled!==_&&{
        awaySummaryEnabled:_
      }
    }
  }),u&&e!==void 0)KZn.of(e).emit()
}function Hyt(e){
  if(z1r())e()
}function YZn(e,n){
  let r=e;
  if(r.isBypassPermissionsModeAvailable&&Tw())r=Ddr(r);
  if(r.strippedDangerousRules!==void 0){
    let s=new Set(Ui),l=!Mb(),a={
    };
    for(let[u,g]of Object.entries(r.strippedDangerousRules))if(g&&(l||u==="command")&&!s.has(u))a[u]=[...g];
    r={
      ...r,strippedDangerousRules:a
    }
  }let o=j6t(r)&&WRn();
  if(o)r=GRn(r);
  return{
    context:awe(r),exitedAutoMode:o
  }
}function XZn(e,n,r,o,s=!1,l,a){
  let u=new Set((n??[]).flatMap((S)=>X(S,l))),g=new Set((r??[]).flatMap((S)=>X(S))),k=e.additionalWorkingDirectories,h=[...u].filter((S)=>!g.has(S)&&!ae(k.get(S)?.source)),_=[...g].filter((S)=>(!u.has(S)||s&&!k.has(S))&&!ae(k.get(S)?.source)),T=hm(),{
    declared:R,repoOnly:F
  }=Wan((S)=>[...T===null?[]:X(S,T),...X(S)],a),A=(S)=>F.has(S)?"projectSettings":"localSettings",m=[...k.entries()].filter(([S,L])=>!ae(L.source)&&!h.includes(S)&&R.has(S)&&L.source!==A(S));
  if(h.length===0&&_.length===0&&m.length===0&&o!=="flagSettings")return e;
  let w=e;
  if(m.length>0){
    let S=new Map(k);
    for(let[L,x]of m)S.set(L,{
      ...x,source:A(L)
    });
    w={
      ...w,additionalWorkingDirectories:S
    }
  }if(o==="flagSettings"){
    let S=new Set((he("flagSettings")?.permissions?.additionalDirectories??[]).flatMap((P)=>X(P))),L=new Map(w.trustedNetworkDirectories??[]),x=!1;
    for(let P of[...L.keys()])if(!S.has(P)&&k.get(P)?.source!=="cliArg"){
      for(let E of L.get(P)??[])if(E!==P)h.push(E);
      L.delete(P),x=!0
    }if(BRn()){
      for(let P of S)if(!L.has(P)){
        if(QGr(P))continue;
        let E=FRn(P);
        if(E.length>0){
          L.set(P,E);
          for(let M of E)if(M!==P)_.push(M);
          x=!0
        }
      }
    }if(x)w={
      ...w,trustedNetworkDirectories:L
    }
  }if(h.length>0)w=Ec(w,{
    type:"removeDirectories",directories:h,destination:"localSettings"
  });
  if(_.length>0)for(let S of["projectSettings","localSettings"]){
    let L=_.filter((x)=>A(x)===S);
    if(L.length>0)w=Ec(w,{
      type:"addDirectories",directories:L,destination:S
    })
  }return w
}function Myt(e,n){
  let r=new Set(fNe().flatMap((l)=>X(l))),o=e.additionalWorkingDirectories,s=n.filter((l)=>{
    let a=o.get(l);return a!==void 0&&!r.has(l)&&!ae(a.source)
  });
  if(s.length===0)return e;
  return Ec(e,{
    type:"removeDirectories",directories:s,destination:"localSettings"
  })
}function ae(e){
  return e==="cliArg"||e==="command"||e==="session"
}function St(e,n){
  return yt(Ye(e,n))
}function X(e,n){
  try{
    return[St(e,n)]
  }catch{
    return[]
  }
} export{
  ije,U1o,xZn,Fwn,Uwn,Bwn,Pj,zre,h2t,y2t,jwn,aje,IZn,PZn,OZn,Wwn,HZn,MZn,_2t,DZn,LZn,NZn,$Zn,FZn,UZn,BZn,jZn,b2t,WZn,Gwn,GZn,S2t,zZn,Yz,zwn,Pbe,Vwn,w2t,QIe,IJe,PJe,ZIe,VZn,OJe,qZn,v2t,Pyt,b8r,KZn,Oyt,Hyt,YZn,XZn,Myt
};