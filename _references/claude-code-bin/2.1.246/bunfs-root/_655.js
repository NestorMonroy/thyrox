// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{C9c as S,t9c as y}from"/$bunfs/root/_773.js";import{Axd as l,xxd as x}from"/$bunfs/root/_837.js";async function R(n,e,t){let p={revisionGuessUsed:!1};if(!n)return{sources:[],outcomes:[],report:p};let{parseGitRemote:G,parseGitHubRepository:h}=await import("/$bunfs/root/chunk-v9924yys.js"),{getDefaultBranch:b}=await import("/$bunfs/root/chunk-qhxx2zzz.js");if(e==="HEAD")e="";let u=!1,s=e||t||void 0;if(!s)s=await b()||void 0,u=s!==void 0;let c=e&&t&&e!==t?[e]:[],a,d;if(e&&c.length===0)a=t?"is_default":"no_evidence",d=t?`[bridge] requested branch '${e}' is the default branch \u2014 `+"omitted from outcomes.branches (the runner stays on the clone)":"[bridge] no session-anchored default-branch evidence \u2014 "+`omitting requested branch '${e}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`;let _={branchDropped:a,revisionGuessUsed:u,warnMessage:d},g=(r,o,f)=>({report:_,sources:[{type:"git_repository",url:`https://${r}/${o}/${f}`,revision:s}],outcomes:[{type:"git_repository",git_info:{type:"github",repo:`${o}/${f}`,branches:c}}]}),i=G(n);if(i)return g(i.host,i.owner,i.name);let m=h(n);if(m){let[r,o]=m.split("/");if(r&&o)return g(y,r,o)}return{sources:[],outcomes:[],report:p}}var v=x(()=>{S()});
export{R as u8b,v as v8b};
