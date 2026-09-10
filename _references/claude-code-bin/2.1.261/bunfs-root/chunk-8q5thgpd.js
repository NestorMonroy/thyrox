// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{pi}from"/$bunfs/root/chunk-n8m6z2zx.js";async function AAn(n,e,t){let u={revisionGuessUsed:!1};if(!n)return{sources:[],outcomes:[],report:u};let{isNestedGitLabProject:l,parseGitRemote:G,parseGitHubRepository:y}=await import("/$bunfs/root/chunk-ve3s03n3.js"),{getDefaultBranch:h}=await import("/$bunfs/root/chunk-kyyqpjwv.js");if(e==="HEAD")e="";let p=!1,r=e||t||void 0;if(!r)r=await h()||void 0,p=r!==void 0;let c=e&&t&&e!==t?[e]:[],a,d;if(e&&c.length===0)a=t?"is_default":"no_evidence",d=t?`[bridge] requested branch '${e}' is the default branch \u2014 `+"omitted from outcomes.branches (the runner stays on the clone)":"[bridge] no session-anchored default-branch evidence \u2014 "+`omitting requested branch '${e}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`;let b={branchDropped:a,revisionGuessUsed:p,warnMessage:d},g=(i,s,f)=>({report:b,sources:[{type:"git_repository",url:`https://${i}/${s}/${f}`,revision:r}],outcomes:[{type:"git_repository",git_info:{type:"github",repo:`${s}/${f}`,branches:c}}]}),o=G(n);if(o){if(l(o))return{sources:[],outcomes:[],report:u};return g(o.host,o.owner,o.name)}let m=y(n);if(m){let[i,s]=m.split("/");if(i&&s)return g(pi,i,s)}return{sources:[],outcomes:[],report:u}}
export{AAn};
