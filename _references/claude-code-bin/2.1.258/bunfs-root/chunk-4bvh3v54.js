// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Cs}from"/$bunfs/root/chunk-09dj6rnx.js";async function Twn(n,e,t){let p={revisionGuessUsed:!1};if(!n)return{sources:[],outcomes:[],report:p};let{parseGitRemote:l,parseGitHubRepository:y}=await import("/$bunfs/root/chunk-kcmftfce.js"),{getDefaultBranch:G}=await import("/$bunfs/root/chunk-nefqkp1x.js");if(e==="HEAD")e="";let u=!1,s=e||t||void 0;if(!s)s=await G()||void 0,u=s!==void 0;let c=e&&t&&e!==t?[e]:[],a,d;if(e&&c.length===0)a=t?"is_default":"no_evidence",d=t?`[bridge] requested branch '${e}' is the default branch \u2014 `+"omitted from outcomes.branches (the runner stays on the clone)":"[bridge] no session-anchored default-branch evidence \u2014 "+`omitting requested branch '${e}' from outcomes.branches; the remote session will work on a generated branch instead. Run 'git remote set-head origin -a' in the repo (or supply defaultBranch via the SDK) to restore branch continuity.`;let h={branchDropped:a,revisionGuessUsed:u,warnMessage:d},g=(r,o,f)=>({report:h,sources:[{type:"git_repository",url:`https://${r}/${o}/${f}`,revision:s}],outcomes:[{type:"git_repository",git_info:{type:"github",repo:`${o}/${f}`,branches:c}}]}),i=l(n);if(i)return g(i.host,i.owner,i.name);let m=y(n);if(m){let[r,o]=m.split("/");if(r&&o)return g(Cs,r,o)}return{sources:[],outcomes:[],report:p}}
export{Twn};
