// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{MT,Px}from"/$bunfs/root/chunk-b1z7jvb2.js";import{vi}from"/$bunfs/root/chunk-64kpb0yv.js";import{ys}from"/$bunfs/root/chunk-sr28hb79.js";import{eE,be}from"/$bunfs/root/chunk-0300m3ak.js";import{ywe,G6n,umn,xv,_2,ip,cg}from"/$bunfs/root/chunk-vw215j9f.js";import{jSn,AXe}from"/$bunfs/root/chunk-mva5kqqk.js";import{Nd,sS,Lf}from"/$bunfs/root/chunk-pdbmw9y3.js";var a=umn.filter((e)=>e!=="userSettings");function dae(e){if(jSn())return!1;if(AXe())return!0;return(e??QIt()).length>0}function QIt(e=ZIt()){let r=[...e];if(i("project"))r.push(".mcp.json");if(i("local"))r.push(`${ys()} (local-scope MCP servers for this project)`);return r}function c(e,r){if(sS())return!1;let o=r?.extraKnownMarketplaces??{};return Object.entries(e?.extraKnownMarketplaces??{}).some(([t,l])=>{if(Object.hasOwn(o,t))return!1;let s=l.source;if(s.source==="url")return!!s.headersHelper&&/^https:\/\//i.test(s.url)&&Lf(s)&&!u(t,s.url);if(s.source==="settings")return Lf(s)&&!p(t)&&s.plugins.some((n)=>!!n.headersHelper&&typeof n.source==="object"&&n.source.source==="archive"&&!Nd(`${n.name}@${t}`));return!1})}function u(e,r){let o=vi();if(a.some((t)=>o.includes(t)&&Object.hasOwn(be(t)?.extraKnownMarketplaces??{},e)))return!0;return G6n({source:"url",url:r},e)!==void 0}function p(e){return Object.hasOwn(xv(),e)}function i(e){if(Px()||cg())return!1;let{servers:r}=ip(e,{expandVars:!1});return Object.entries(r).some(([o,t])=>("headersHelper"in t)&&!!t.headersHelper&&!(e==="project"&&ywe(o)==="rejected")&&_2(o,t))}function ZIt(){if(MT())return[];let e=vi(),r=e.includes("localSettings")?be("localSettings"):null,o=[];if(e.includes("projectSettings")&&!eE()&&c(be("projectSettings"),r))o.push(".claude/settings.json");if(c(r))o.push(".claude/settings.local.json");return o}
export{dae,QIt,ZIt};
