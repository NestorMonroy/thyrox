// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{fm}from"/$bunfs/root/chunk-b93xrf5w.js";function wqt(e){if(!e||Object.keys(e).length===0)return!1;for(let n of fm){let o=e[n];if(!o||o.length===0)continue;for(let s of o)if((s.hooks?.length??0)>0)return!0}return!1}function p6r(e,n,o,s,h=!1){if(!o||Object.keys(o).length===0)return;let r=0;for(let i of fm){let f=o[i];if(!f||f.length===0)continue;let c=i;if(h&&i==="Stop")c="SubagentStop",t(`Converting Stop hook to SubagentStop for ${s} (subagents trigger SubagentStop)`);for(let a of f){let k=a.matcher??"",g=a.hooks;if(!g||g.length===0)continue;for(let m of g)e.add(n,c,k,m),r++}}if(r>0)t(`Registered ${r} frontmatter hook(s) from ${s} for session ${n}`)}
export{wqt,p6r};
