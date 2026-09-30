// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Bp,Vh}from"/$bunfs/root/chunk-cg7sbvw4.js";import{isIP as d}from"net";var n={debug:0,info:1,warn:2,error:3};function m(){let e=a.CLAUDE_GATEWAY_LOG_LEVEL?.toLowerCase();return e&&e in n?n[e]:n.info}var p={"\n":"\\n","\r":"\\r","\t":"\\t"};function c(e){return e.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,(t)=>p[t]??`\\u${t.charCodeAt(0).toString(16).padStart(4,"0")}`)}function Lr(e,t){if(n[e]<m())return;process.stderr.write(`[gateway] ${new Date().toISOString()} ${e} ${c(t)}
`)}function qW(e,t){process.stderr.write(`${JSON.stringify({ts:new Date().toISOString(),evt:e,...t})}
`)}function eFr(e,t){process.stderr.write(`
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
`+`\u2502  Claude Code Gateway                \u2502
`+`\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);let i=t.tls?"https":"http",l=["metrics","logs","traces"].filter((r)=>e.telemetry.forward_to.some((o)=>o[r]));if(Lr("info",`claude gateway listening on ${i}://${t.hostname}:${t.port}`),e.listen.public_url)Lr("info",`public_url ${e.listen.public_url}`);let s=e.listen.trusted_proxies.length;if(Lr("info",s===0?"client IPs: TCP peer address (listen.trusted_proxies empty)":`client IPs: X-Forwarded-For via listen.trusted_proxies (${s} ${s===1?"entry":"entries"})`),e.oidc){Lr("info",`oidc issuer ${e.oidc.issuer}`);let r=e.oidc.allowed_email_domains??[];Lr("info",`email domains ${r.length>0?r.join(","):"(unrestricted)"}`);let o=e.oidc.allowed_groups??[];Lr("info",`allowed groups ${o.length>0?o.join(","):"(unrestricted)"}`)}else Lr("info","oidc: not configured (customer-routed inference only)");if(e.cri?.enabled)Lr("info",`customer-routed inference: enabled (${e.cri.org_allowlist.length} allowed org(s), policy webhook ${e.cri.policy?.webhook?"configured":"not configured"})`);Lr("info",`upstreams ${e.upstreams.length}: ${e.upstreams.map((r)=>`${r.name}(${r.provider})`).join(", ")}`),Lr("info",e.telemetry.forward_to.length===0?"telemetry relay: not configured":`telemetry relay: ${e.telemetry.forward_to.length} destination(s), signals enabled: ${l.join(",")||"none"}`);for(let r of e.telemetry.forward_to){let{host:o,hostname:u}=new URL(r.url);if(!d(u.replace(/^\[|\]$/g,""))&&Bp()&&Vh(r.url))Lr("info",`telemetry relay: ${o} matches NO_PROXY; exports to it skip the proxy`)}Lr("info",`managed settings: ${t.managed?"configured":"not configured"}`),Lr("info",`upstream requests: at most ${t.outboundLimit} at once per process (set BUN_CONFIG_MAX_HTTP_REQUESTS to change)`)}
export{Lr,qW,eFr};
