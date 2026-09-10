// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{l}from"/$bunfs/root/chunk-058caznt.js";import{VD,h2,XM,JM,O2t}from"/$bunfs/root/chunk-qpwbvc04.js";async function xWe(g,r){let[o,s]=await Promise.allSettled([JM(void 0,g,r),O2t(void 0,r)]),i=o.status==="rejected"?l(o.reason):null,d=o.status==="fulfilled"?o.value:[],a=s.status==="fulfilled"?s.value:[],t=[...d,...a],e=XM(),u=e.ignoredUntrustedPool??null;if(e.id!==void 0&&h2(e.id)&&!t.some((n)=>VD(n)===e.id))t.push({kind:"self_hosted_pool",pool_id:e.id,name:e.id,created_at:"",alive_runner_count:0});if(t.length===0)return{availableTargets:[],selectedTarget:null,selectedTargetSource:null,environmentsError:i,ignoredUntrustedPool:u};let c=d.find((n)=>n.kind!=="bridge")??a[0]??t[0],f=null;if(e.id!==void 0){let n=t.find((m)=>VD(m)===e.id);if(n)c=n,f=e.source??null}return{availableTargets:t,selectedTarget:c,selectedTargetSource:f,environmentsError:i,ignoredUntrustedPool:u}}
export{xWe};
