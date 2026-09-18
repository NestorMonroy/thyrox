// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Fs}from"/$bunfs/root/chunk-tjpyqt9m.js";async function $hn(s){let{isNestedGitLabProject:e,parseGitRemote:t,parseGitHubRepository:p}=await import("/$bunfs/root/chunk-mjm4adyq.js"),r=t(s);if(r)return e(r)?null:r;let i=p(s);if(i){let[o,n]=i.split("/");if(o&&n)return{host:Fs,owner:o,name:n}}return null}async function z9n(s,e,t){let p={revisionGuessUsed:!1};if(!s)return{sources:[],outcomes:[],report:p};let{getDefaultBranch:r}=await import("/$bunfs/root/chunk-em0f7zh7.js");if(e==="HEAD")e="";let i=!1,o=e||t||void 0;if(!o)o=await r()||void 0,i=o!==void 0;let n=e&&t&&e!==t?[e]:[],c,a;if(e&&n.length===0)c=t?"is_default":"no_evidence",a=t?`[bridge] requested branch '${e}' is the default branch \u2014 `+"omitted from outcomes.branches (the runner stays on the clone)":"[bridge] no session-anchored default-branch evidence \u2014 "+`omitting requested branch '${e}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`;let l={branchDropped:c,revisionGuessUsed:i,warnMessage:a},m=(f,d,g)=>({report:l,sources:[{type:"git_repository",url:`https://${f}/${d}/${g}`,revision:o}],outcomes:[{type:"git_repository",git_info:{type:"github",repo:`${d}/${g}`,branches:n}}]}),u=await $hn(s);if(u)return m(u.host,u.owner,u.name);return{sources:[],outcomes:[],report:p}}
export{$hn,z9n};
