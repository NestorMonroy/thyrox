sion:de().optional(),kind:Bl(["interactive","bg","daemon","daemon-worker"]),entrypoint:de().optional(),pidDomain:de().optional()}));
class By{uncleanExitsScanned=!1;reportedUncleanExitPaths=new Set;watchedCache=void 0;pidFileWriteChain=Promise.resolve();registeredName=void 0;formerNames=[];conversationNames=new Map;adoptions=0;restores=0;liveSessionId=void 0;restoreSetAsideName=void 0;heldNames=new Map;registered=!1;bornSpare=!1;spareClaimPoll=void 0;registration=void 0;registrySweepPermitted=void 0;registeredNameChanged=He();setRegisteredName(e,n,r){let s=this.registeredName,g=Date.now(),h=Cr(e),S=Y(),E=r??s?.givenAtLaunch;if(s&&Cr(s.name)===h){if(this.registeredName={name:e,source:n,since:s.since,sessionId:S,...E&&{givenAtLaunch:E}},s.name!==e||s.source!==n)this.registeredNameChanged.emit();return}if(s)this.heldNames.set(Cr(s.name),s.source);if(this.heldNames.delete(h),this.formerNames=this.formerNames.filter((w)=>Cr(w.name)!==h),s&&(s.source!=="derived"||Nq())&&g-s.since>=JM){let w=Cr(s.name);this.formerNames=[{name:s.name,until:g,sessionId:s.sessionId},...this.formerNames.filter((C)=>Cr(C.name)!==w)].slice(0,KKn)}if(this.registeredName={name:e,source:n,since:g,sessionId:S,...r&&{givenAtLaunch:r}},n!=="derived"&&this.liveSessionId!==void 0)this.conversationNames.delete(this.liveSessionId);this.registeredNameChanged.emit()}setAsideRegisteredName(e,n){let r=this.registeredName;if(r===void 0)return;if(this.heldNames.set(Cr(r.name),r.source),this.conversationNames.delete(e),this.conversationNames.set(e,{name:r.name,source:r.source}),this.conversationNames.size>XM){for(let s of this.conversationNames.keys())if(s!==n){this.conversationNames.delete(s);break}}this.registeredName=void 0}setUncleanExitsScanned(e){this.uncleanExitsScanned=e}markUncleanExitReported(e){this.reportedUncleanExitPaths.add(e)}setWatchedCache(e){this.watchedCache=e}setPidFileWriteChain(e){this.pidFileWriteChain=e}isRegistrySweepPermitted(){return this.registrySweepPermitted??=this.probeRegistrySweepPermitted(),this.registrySweepPermitted}async probeRegistrySweepPermitted(){let e=O();if(e==="wsl")return!1;if(!_u()&&e!=="windows"&&e!=="macos")return!1;if(e==="windows"&&(a.CONTAINER_SANDBOX_MOUNT_POINT!==void 0||a.USERNAME==="ContainerAdministrator"||a.USERNAME==="ContainerUser"))return!1;if(Dw.getIsBubblewrapSandbox()||Le(a.IS_SANDBOX)||await Dw.getIsDocker())return!1;return gfn()}}var eD=new q(()=>new By);
function HH(){return eD.of(j().host)}
function Y5o(){return HH().heldNames}
function kv(){return HH().registeredName}
function Cut(){let e=HH();return e.registration??Promise.resolve(e.registered)}
function oJ(){let e=a.CLAUDE_CODE_SESSION_KIND;if(e==="bg"||e==="daemon"||e==="daemon-worker")return e;return}
function vt(){return oJ()==="bg"}
function fm(){return Ul()||vt()||dR()!==void 0}
function Ip(){return vt()&&!md()}
function tc(){return vt()||fb()!==null}
function tz(){return fb()?.jobDir??a.CLAUDE_JOB_DIR}
function jte(){return a.CLAUDE_BG_BACKEND==="daemon"}var Ds=".fleetview-heartbeat",Gy=5000;
function ld(){return Re.session(Ds)}
function Ms(){return Re.session(`${process.pid}.json`)}
async function jNr(e){if(e){try{let n=await e.write(ld(),String(Date.now()),{publishDiscipline:"inPlace"});if(!n.ok&&!fBe(n.error))t(`[concurrentSessions] heartbeat touch failed: ${rt(n.error)}`)}catch(n){t(`[concurrentSessions] heartbeat touch failed: ${l(n)}`)}return}try{await ad(ft(sz(),Ds),String(Date.now()))}catch{}}
async function WNr(e){if(e){try{await e.delete(ld())}catch{}return}try{await ho(ft(sz(),Ds))}catch{}}var tD=1000;
function $y(e,n){let{watchedCache:r}=e;return r&&n-r.at<tD?r.value:void 0}
function VNt(){let e=HH(),n=Date.now(),r=$y(e,n);if(r!==void 0)return r;
let s=!1;try{let{mtimeMs:g}=GM(ft(sz(),Ds));s=n-g<Gy}catch(g){if(!U(g))t(`[concurrentSessions] heartbeat stat failed: ${l(g)}`)}return e.setWatchedCache({at:n,value:s}),s}
async function qNt(e){let n=HH(),r=Date.now(),s=$y(n,r);if(s!==void 0)return s;
let g;try{let w=await e.statMeta(ld());if(w.ok)g=w.value.mtimeMs;else if(w.error.code!=="NotFound")t(`[concurrentSessions] heartbeat stat failed: ${rt(w.error)}`)}catch(w){t(`[concurrentSessions] heartbeat stat failed: ${l(w)}`)}let h=Date.now(),S=g!==void 0&&h-g<Gy,E=n.watchedCache;if(!E||E.at<r)n.setWatchedCache({at:h,value:S});return S}
function KNt(e){let n=HH(),r=nD(n,e);return n.registration=r,r}
async function nD(e,n){if(!ud())return!1;
let r=Promise.withResolvers();e.setPidFileWriteChain(r.promise);
let s=oJ()??"interactive";e.bornSpare=s==="bg"&&a.CLAUDE_BG_SOURCE==="spare";
let g=e.bornSpare&&!await jy(n),h=a.CLAUDE_CODE_SESSION_NAME?li(a.CLAUDE_CODE_SESSION_NAME)||void 0:void 0,S=sz(),E=ft(S,`${process.pid}.json`);process.on("exit",()=>{try{$M(E)}catch{}}),gt(async()=>{if(n){try{await n.delete(Ms())}catch{}return}try{await ho(E)}catch{}});try{let w=await lD();await zM(S,{recursive:!0,mode:448}),await WM(S,448);
let C=h?{name:h,source:"user"}:s==="interactive"?{name:xs(we(),Y()),source:"derived"}:void 0,T=b({pid:process.pid,sessionId:Y(),cwd:we(),startedAt:Date.now(),procStart:await nc(process.pid),version:{ISSUES_EXPLAINER:"report the issue at https://github.com/anthropics/claude-code/issues",PACKAGE_URL:"@anthropic-ai/claude-code",README_URL:"https://code.claude.com/docs/en/overview",VERSION:"2.1.283",FEEDBACK_CHANNEL:"https://github.com/anthropics/claude-code/issues",BUILD_TIME:"2026-09-25T00:44:42Z",GIT_SHA:"4631ccd7cfe41e69bc72d3b5b9dc7282536e4985",HOOKS_WORKER_URL:"/$bunfs/root/src/plugins/functionHooks/hooks-worker/hooks-worker.js",DD_SOURCEMAP_GROUP:"default"}.VERSION,peerProtocol:YKn,peerFeatures:ZM(),kind:s,entrypoint:a.CLAUDE_CODE_ENTRYPOINT,hostSessionId:QKn(),pidDomain:await HP(),...w&&{tmux:w},...{messagingSocketPath:Gw.CLAUDE_CODE_MESSAGING_SOCKET},...{name:C?.name,nameSource:C?.source==="derived"?"derived":void 0,nameSince:Date.now(),logPath:a.CLAUDE_CODE_SESSION_LOG,agent:a.CLAUDE_CODE_AGENT,jobId:s==="bg"&&a.CLAUDE_JOB_DIR?YM(a.CLAUDE_JOB_DIR):void 0,spare:g?!0:void 0}});if(n){let P=await n.write(Ms(),T,{publishDiscipline:"inPlace"});if(!P.ok)throw t(`[concurrentSessions] v5 pid-file write failed: ${rt(P.error)}`),Error("v5 pid-file write failed")}else await ad(E,T);if(e.registered=!0,g)iD(n);if(C&&e.registeredName===void 0)e.setRegisteredName(C.name,C.source,C.source==="derived"?void 0:!0);return e.liveSessionId=Y(),Zd((P,M)=>{let F=HH(),{registeredName:L,liveSessionId:B}=F;if(F.liveSessionId=P,Nq()&&xy(M)){F.adoptions++;
let W=F.conversationNames.get(P),X=L!==void 0&&L.source!=="derived"&&!L.givenAtLaunch&&L.sessionId!==P;if(X&&B!==void 0)F.setAsideRegisteredName(B,P);if(L?.source==="derived"||X){if(eF(xs(we(),P),n,"derived"),W!==void 0)F.restoreSetAsideName?.(W.name,W.source)}else if(L!==void 0)F.registeredName={...L,sessionId:P}}Vt({sessionId:P,parkedJobId:void 0,updatedAt:Date.now()},n)}),kzr((P)=>{if(Nq()&&HH().registeredName?.source==="derived")eF(xs(P,Y()),n,"derived");Vt({cwd:P},n)}),!0}catch(w){return t(`[concurrentSessions] register failed: ${l(w)}`),!1}finally{r.resolve()}}
async function Vt(e,n){let r=ft(sz(),`${process.pid}.json`),s=HH(),g=s.pidFileWriteChain.then(async()=>{try{if(n){let S=await n.read([Ms()]);if(!S.ok)return t(`[concurrentSessions] updatePidFile failed: ${rt(S.error)}`),!1;
let E=S.value.items[0];if(!E?.found)return t("[concurrentSessions] updatePidFile failed: pid file not found"),!1;
let w=J(Buffer.from(E.value).toString("utf8")),C=await n.write(Ms(),b({...w,...e}),{publishDiscipline:"inPlace"});if(!C.ok)return t(`[concurrentSessions] updatePidFile failed: ${rt(C.error)}`),!1;return!0}let h=J(await VM(r,"utf8"));return await ad(r,b({...h,...e})),!0}catch(h){return t(`[concurrentSessions] updatePidFile failed: ${l(h)}`),!1}});return s.setPidFileWriteChain(g.then(()=>{return})),g}
async function eF(e,n,r="user",s){if(!e)return!1;
let g=HH();g.setRegisteredName(e,r,s);
let S=await Vt({name:e,nameSource:r,formerNames:g.formerNames.length>0?g.formerNames:void 0,nameSince:g.registeredName?.since??Date.now(),updatedAt:Date.now()},n)||!ud();if(!S)t(`[session-name] "${e}" applied locally but the session registry record was not updated \u2014 other sessions may keep showing the old name (see "updatePidFile failed" above)`,{level:"warn"});return S}
function QKn(){if(!yu()||Jx())return;return opn(a.CLAUDE_CODE_HOST_SESSION_ID)}
function ud(){return Vk()==null&&!kFe()}
async function Rut(e,n){let r=li(e);await Cut();
let s=HH(),g=s.registeredName;if(!r||g===void 0||!(g.source==="derived"||g.source==="auto"&&Cr(g.name)!==Cr(r)))return!1;
let h=await eF(r,n,"auto"),S=s.registeredName;if(!h&&S?.name===r&&S.source==="auto"){let E=Cr(g.name);s.registeredName=g,s.heldNames.delete(E),s.formerNames=s.formerNames.filter((w)=>Cr(w.name)!==E),s.registeredNameChanged.emit()}return h}
async function X5o(e,n){await Vt({messagingSocketPath:e,updatedAt:Date.now()},n)}
async function ipn(e,n){await Vt({bridgeSessionId:e},n)}
async function GNr(e,n){await Vt({parkedJobId:e,updatedAt:Date.now()},n)}
async function apn(e){await Vt({parkedJobId:void 0,updatedAt:Date.now()},e)}
async function kCe(e,n){let r=Date.now(),s=HH(),g=s.bornSpare&&e.status==="busy",h=await Vt({...e,updatedAt:r,...e.status!==void 0&&{statusUpdatedAt:r},...g&&{spare:void 0}},n);if(g&&h)Wy(s);return h||!ud()}
function Wy(e){if(e.spareClaimPoll!==void 0)clearInterval(e.spareClaimPoll),e.spareClaimPoll=void 0}
async function rD(e){if(!HH().bornSpare)return!0;return Vt({spare:void 0,updatedAt:Date.now()},e)}
async function jy(e){let n=tz();if(!n)return!1;if(N()&&e!==void 0){let r=qKn(n,["state.json"]);if(r!==void 0)try{let s=await e.statMeta(r);return s.ok||s.error.code!=="NotFound"&&s.error.code!=="Unavailable"}catch{return!1}}try{return await jM(ft(n,"state.json")),!0}catch(r){return!U(r)}}var oD=1000;
function iD(e){let n=HH(),r={registry:n,storageV5:e,clearing:!1};n.spareClaimPoll=setInterval(sD,oD,r),n.spareClaimPoll.unref()}
function sD(e){if(e.clearing||e.registry.spareClaimPoll===void 0)return;e.clearing=!0,jy(e.storageV5).then((n)=>n?rD(e.storageV5):!1).then((n)=>{if(n)Wy(e.registry)}).finally(()=>{e.clearing=!1})}
async function Ny(e,n){try{let r=await e.read([{key:Re.session(n),offset:0,length:bYe+1}]),s=r.ok?r.value.items[0]:void 0;if(!s?.found||s.value.byteLength>bYe)return null;return id().safeParse(J(Buffer.from(s.value).toString("utf8")))}catch{return null}}
async function Fy(e,n){try{let r=await e.delete(Re.session(n));return r.ok&&r.value.existed}catch{return!1}}
async function zy(e){return J4n(e,{partialOnCap:!0,onIssue:(n,r)=>t(`[concurrentSessions] session list ${n}`,r===void 0?void 0:{level:r})})}
function TCe(){return HH().isRegistrySweepPermitted()}
function aD(e){return O()==="windows"&&e!==void 0&&e.startsWith("/")}
async function ZKn(e,n,r,s){if(N()&&s!==void 0){let h=await zy(s);if(h===void 0)return;await Ly(h,e,n,r,(S)=>s.delete(Re.session(S)).then(()=>{},()=>{}));return}let g;try{g=await Uy(e)}catch{return}await Ly(g,e,n,r,(h)=>ho(ft(e,h)).catch(()=>{}))}
async function Ly(e,n,r,s,g){let h=`${r}.`;await Promise.all(e.map(async(S)=>{if(!S.startsWith(h)||!rfn.test(S))return;
let E=await ifn(ft(n,S));if(E!==void 0&&E!==s)return;if(r===process.pid||!Nh(r))return;await g(S)}))}
function lpn(e,n,r=[]){let s=O(),g=!_u();if(e===null){if(r.some((h)=>h!==void 0&&h!==n))return!1;return s!=="windows"&&!(s==="macos"&&g)}if(e.pidDomain!==void 0)return e.pidDomain===n;switch(s){case"windows":return!aD(e.cwd);case"macos":return!g||e.cwd===void 0||e.cwd.startsWith(Iy()+qM)||e.cwd===Iy();default:return!0}}
async function xut(e){let n=sz(),r;if(e){let T=await zy(e);if(T===void 0)return 0;r=T}else try{r=await Uy(n)}catch(T){if(!kt(T))t(`[concurrentSessions] readdir failed: ${l(T)}`);return 0}let s=HH(),g=await s.isRegistrySweepPermitted(),h=g?await HP():"";t(`[sessionRegistry] sweep ${g?`permitted (domain ${h})`:"declined by isRegistrySweepPermitted() \u2014 dead records are left in place (neither counted nor deleted)"}`);
let S=0,E=new Set,w=new Set,C=new Map;for(let T of r){let P=rfn.exec(T);if(P){let M=parseInt(P[1],10);C.set(M,[...C.get(M)??[],T])}}for(let T of r){if(!/^\d+\.json$/.test(T))continue;
let P=parseInt(T.slice(0,-5),10);if(P===process.pid){S++;continue}if(ua(P)){S++;continue}if(!Nh(P))continue;if(!g)continue;
let M=ft(n,T),F
