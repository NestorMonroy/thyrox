// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{jL}from"/$bunfs/root/chunk-bnc671w7.js";var yGe="Can't open \u2014 this session is running in another terminal";function Pae({sessionId:o,holder:i,canFork:s}){let{jobId:e}=i,n=e?`Run \`claude attach ${e}\` to open it, or \`claude stop ${e}\` first to resume it here.`:"Run `claude agents` to find its id, then `claude attach <id>` to open it, or `claude stop <id>` first to resume it here.",t=s?" Add --fork-session to branch off a copy instead.":"";return`Session ${o} is running as a background session${e?` (${e})`:""}. ${n}${t}`}async function T4(o){let i=(await sit(o)).find((e)=>e.kind!=="interactive");if(!i)return null;let s=i.jobId!==void 0&&jL.test(i.jobId)?i.jobId:void 0;return{kind:i.kind,jobId:s}}async function sit(o,i){let s=i?.rejectUnreadable?await(await import("/$bunfs/root/chunk-bz9j3n03.js")).listAllLiveSessions(void 0,{rejectUnreadable:!0}):await import("/$bunfs/root/chunk-bz9j3n03.js").then((n)=>n.listAllLiveSessions()).catch(()=>[]),e=[];for(let n of s){if(n.sessionId!==o||n.pid===process.pid||!n.kind)continue;if(n.kind==="interactive"&&n.parkedJobId!==void 0)continue;e.push({kind:n.kind,jobId:n.jobId,pid:n.pid})}return e}
export{yGe,Pae,T4,sit};
