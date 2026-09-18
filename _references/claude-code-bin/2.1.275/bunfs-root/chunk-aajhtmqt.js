// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{a}from"/$bunfs/root/chunk-crr3rzxx.js";var o={debug:0,info:1,warn:2,error:3};function u(){let e=a.CLAUDE_GATEWAY_LOG_LEVEL?.toLowerCase();return e&&e in o?o[e]:o.info}var d={"\n":"\\n","\r":"\\r","\t":"\\t"};function c(e){return e.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,(t)=>d[t]??`\\u${t.charCodeAt(0).toString(16).padStart(4,"0")}`)}function Gr(e,t){if(o[e]<u())return;process.stderr.write(`[gateway] ${new Date().toISOString()} ${e} ${c(t)}
`)}function IU(e,t){process.stderr.write(`${JSON.stringify({ts:new Date().toISOString(),evt:e,...t})}
`)}function Amr(e,t){process.stderr.write(`
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
`+`\u2502  Claude Code Gateway                \u2502
`+`\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
`);let s=t.tls?"https":"http",l=["metrics","logs","traces"].filter((r)=>e.telemetry.forward_to.some((n)=>n[r]));if(Gr("info",`claude gateway listening on ${s}://${t.hostname}:${t.port}`),e.listen.public_url)Gr("info",`public_url ${e.listen.public_url}`);let i=e.listen.trusted_proxies.length;if(Gr("info",i===0?"client IPs: TCP peer address (listen.trusted_proxies empty)":`client IPs: X-Forwarded-For via listen.trusted_proxies (${i} ${i===1?"entry":"entries"})`),e.oidc){Gr("info",`oidc issuer ${e.oidc.issuer}`);let r=e.oidc.allowed_email_domains??[];Gr("info",`email domains ${r.length>0?r.join(","):"(unrestricted)"}`);let n=e.oidc.allowed_groups??[];Gr("info",`allowed groups ${n.length>0?n.join(","):"(unrestricted)"}`)}else Gr("info","oidc: not configured (customer-routed inference only)");if(e.cri?.enabled)Gr("info",`customer-routed inference: enabled (${e.cri.org_allowlist.length} allowed org(s), policy webhook ${e.cri.policy?.webhook?"configured":"not configured"})`);Gr("info",`upstreams ${e.upstreams.length}: ${e.upstreams.map((r)=>`${r.name}(${r.provider})`).join(", ")}`),Gr("info",e.telemetry.forward_to.length===0?"telemetry relay: not configured":`telemetry relay: ${e.telemetry.forward_to.length} destination(s), signals enabled: ${l.join(",")||"none"}`),Gr("info",`managed settings: ${t.managed?"configured":"not configured"}`),Gr("info",`upstream requests: at most ${t.outboundLimit} at once per process (set BUN_CONFIG_MAX_HTTP_REQUESTS to change)`)}
export{Gr,IU,Amr};
