// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{$Eb as v,XEb as r,YEb as S,ZEb as l,bFb as p,cFb as T}from"/$bunfs/root/_569.js";import{Mud as m,zvd as P}from"/$bunfs/root/_831.js";import{xxd as I}from"/$bunfs/root/_837.js";async function k(E,s){let[o,i]=await Promise.allSettled([v(void 0,E,s),p(void 0,s)]),d=o.status==="rejected"?m(o.reason):null,a=o.status==="fulfilled"?o.value:[],u=i.status==="fulfilled"?i.value:[],t=[...a,...u],e=l(),c=e.ignoredUntrustedPool??null;if(e.id!==void 0&&S(e.id)&&!t.some((n)=>r(n)===e.id))t.push({kind:"self_hosted_pool",pool_id:e.id,name:e.id,created_at:"",alive_runner_count:0});if(t.length===0)return{availableTargets:[],selectedTarget:null,selectedTargetSource:null,environmentsError:d,ignoredUntrustedPool:c};let f=a.find((n)=>n.kind!=="bridge")??u[0]??t[0],g=null;if(e.id!==void 0){let n=t.find((R)=>r(R)===e.id);if(n)f=n,g=e.source??null}return{availableTargets:t,selectedTarget:f,selectedTargetSource:g,environmentsError:d,ignoredUntrustedPool:c}}var _=I(()=>{P();T();T()});
export{k as Kh,_ as Lh};
