// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
function f(i){let t=!1,e,n={addDir:[],pluginDir:[],pluginDirNoMcp:[],settings:void 0,mcpConfig:[],strictMcpConfig:!1},r=[],l={"--cwd":(s)=>{e=s},"--settings":(s)=>{n.settings=s},"--add-dir":(s)=>n.addDir.push(s),"--plugin-dir":(s)=>n.pluginDir.push(s),"--plugin-dir-no-mcp":(s)=>n.pluginDirNoMcp.push(s),"--mcp-config":(s)=>n.mcpConfig.push(s)};for(let s=0;s<i.length;s++){let g=i[s];if(g==="agents"&&!t){t=!0;continue}if(g==="--strict-mcp-config"){n.strictMcpConfig=!0;continue}let o=g.indexOf("="),a=o===-1?g:g.slice(0,o),p=Object.hasOwn(l,a)?l[a]:void 0;if(p){if(o!==-1)p(g.slice(o+1));else if(s+1<i.length)p(i[++s]);else r.push(g);continue}r.push(g)}return{hasAgentsPositional:t,cwdFilter:e,config:n,rest:r}}function c(i,t){let e=(n,r)=>n===""||r&&n.trimStart().startsWith("{")?n:t(n);return{settings:i.settings===void 0?void 0:e(i.settings,!0),pluginDir:i.pluginDir.map((n)=>e(n,!1)),pluginDirNoMcp:i.pluginDirNoMcp.map((n)=>e(n,!1)),addDir:i.addDir.map((n)=>e(n,!1)),mcpConfig:i.mcpConfig.map((n)=>e(n,!0)),strictMcpConfig:i.strictMcpConfig}}function d(i){return[...i.settings?["--settings",i.settings]:[],...i.pluginDir.flatMap((t)=>["--plugin-dir",t]),...i.pluginDirNoMcp.flatMap((t)=>["--plugin-dir-no-mcp",t]),...i.addDir.flatMap((t)=>["--add-dir",t]),...i.mcpConfig.flatMap((t)=>["--mcp-config",t]),...i.strictMcpConfig?["--strict-mcp-config"]:[]]}function u(i){let t=0;while(i[t]==="--dangerously-skip-permissions"||i[t]==="--allow-dangerously-skip-permissions")t++;return i[t]==="daemon"?i.slice(t+1):null}
export{f as l$c,c as m$c,d as n$c,u as o$c};
