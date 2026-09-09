// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Gt,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{G}from"/$bunfs/root/chunk-aznf32zy.js";import{g}from"/$bunfs/root/chunk-dzyeyv65.js";class U6n{state={status:"inactive"};fallbackSadEmitted=new Set;toolsBaseline={captured:!1}}var uyr=new Gt(()=>new U6n);function o(){return uyr.of(B())}function One(){return o().state}function Efn(e){let t=o();if(t.state.status!=="inactive")return;t.state=e}function qq(e,t){let r=o();if(r.state.status==="reverted")return;if(r.state.status==="active")if(e==="device_tool_requested")G("info","cli_teleport_relay_ended",{reason:e});else g("upgrade_teleport_cache",e),l(e);r.state={status:"reverted",reason:e,detail:t}}function Gve(e){let t=o();if(t.fallbackSadEmitted.has(e))return;t.fallbackSadEmitted.add(e),g("upgrade_teleport_cache",e),l(e)}function l(e){G("warn","cli_teleport_relay_fallback",{reason:e})}function kfn(e){let t=One();if(t.status!=="active")return!1;let r=t.preAnchorLineUuids;if(e.length<r.length)return qq("context_reduced",`live view has ${e.length} lines before its tail; the arm snapshot guarded ${r.length}`),!1;for(let a=0;a<r.length;a++)if(e[a]!==r[a])return qq("context_reduced",`pre-anchor line ${a} changed since arm`),!1;return!0}function Afn(e,t){let r=o();if(r.state.status!=="active")return!1;let a=r.toolsBaseline;if(!a.captured)return r.toolsBaseline={captured:!0,model:e,fingerprint:t},!0;if(e!==a.model)return Gve("model_mismatch"),!1;if(a.fingerprint===t)return!0;return qq("tools_changed",a.fingerprint===null?"session gained a toolset after a toolless first relay-attempted dispatch":t===null?"session lost its toolset after a tooled first relay-attempted dispatch":"outgoing toolset diverged from the first relay-attempted dispatch baseline"),!1}
export{U6n,uyr,One,Efn,qq,Gve,kfn,Afn};
