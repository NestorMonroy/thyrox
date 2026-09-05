// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Syc as s,Tyc as v,_yc as w}from"/$bunfs/root/_679.js";import{MGc as b,VGc as L}from"/$bunfs/root/_704.js";import{Tbd as A}from"/$bunfs/root/_811.js";import{ncd as m}from"/$bunfs/root/_812.js";import{dwd as D}from"/$bunfs/root/_832.js";import{xxd as C}from"/$bunfs/root/_837.js";function x(a){let p=P(a);if(p===null)return null;let r=s(a.totalTokens-a.rawMaxTokens),i=s(a.rawMaxTokens);if(p==="hard_limit"){let c=m.DISABLE_COMPACT?"/clear":"/compact or /clear";return`Context exceeds the ${i}-token limit by ${r} tokens \u2014 run ${c} to continue.`}let l=m.DISABLE_COMPACT?"/clear":"/compact";return`Context is ${r} tokens past the ${i}-token compaction window \u2014 run ${l} to reduce usage.`}function P(a){if(a.totalTokens<=a.rawMaxTokens)return null;return a.autocompactSource==="auto"?"hard_limit":"compaction_window"}var E=C(()=>{A();w()});function V(a,p){let{categories:r,totalTokens:i,rawMaxTokens:l,percentage:c,model:B,memoryFiles:k,mcpTools:g,agents:f,skills:u,messageBreakdown:M,systemTools:T,systemPromptSections:d}=a,t=`## Context Usage

`;t+=`**Model:** ${B}  
`,t+=`**Tokens:** ${s(i)} / ${s(l)} (${c}%)
`;let h=x(a);if(h)t+=`**Over limit:** ${h}
`;t+=`
`;let y=r.filter((e)=>e.tokens>0&&e.name!=="Free space"&&e.name!=="Autocompact buffer");if(y.length>0){t+=`### Estimated usage by category

`,t+=`| Category | Tokens | Percentage |
`,t+=`|----------|--------|------------|
`;for(let n of y){let S=(n.tokens/l*100).toFixed(1);t+=`| ${n.name} | ${s(n.tokens)} | ${S}% |
`}let e=r.find((n)=>n.name==="Free space");if(e&&e.tokens>0){let n=(e.tokens/l*100).toFixed(1);t+=`| Free space | ${s(e.tokens)} | ${n}% |
`}let o=r.find((n)=>n.name==="Autocompact buffer");if(o&&o.tokens>0){let n=(o.tokens/l*100).toFixed(1);t+=`| Autocompact buffer | ${s(o.tokens)} | ${n}% |
`}t+=`
`}if(g.length>0){t+=`### MCP Tools

`,t+=`| Tool | Server | Tokens |
`,t+=`|------|--------|--------|
`;for(let e of g)t+=`| ${e.name} | ${e.serverName} | ${s(e.tokens)} |
`;t+=`
`}if(T&&T.length>0,d&&d.length>0,f.length>0){t+=`### Custom Agents

`,t+=`| Agent Type | Source | Tokens |
`,t+=`|------------|--------|--------|
`;for(let e of f){let o;switch(e.source){case"projectSettings":o="Project";break;case"userSettings":o="User";break;case"localSettings":o="Local";break;case"flagSettings":o="Flag";break;case"policySettings":o="Policy";break;case"plugin":o="Plugin";break;case"built-in":o="Built-in";break;default:o=String(e.source)}t+=`| ${e.agentType} | ${o} | ${s(e.tokens)} |
`}t+=`
`}if(k.length>0){t+=`### Memory Files

`,t+=`| Type | Path | Tokens |
`,t+=`|------|------|--------|
`;for(let e of k)t+=`| ${e.type} | ${e.path} | ${s(e.tokens)} |
`;t+=`
`}if(u&&u.tokens>0&&u.skillFrontmatter.length>0){t+=`### Skills

`,t+=`| Skill | Source | Tokens |
`,t+=`|-------|--------|--------|
`;for(let e of u.skillFrontmatter){let o=b(e.source)+(e.pluginName?` (${e.pluginName})`:"");t+=`| ${e.name} | ${o} | ${v(e.tokens)} |
`}t+=`
`}return t}var F=C(()=>{E();w();L();D()});
export{x as zO,P as AO,E as BO,V as CO,F as DO};
