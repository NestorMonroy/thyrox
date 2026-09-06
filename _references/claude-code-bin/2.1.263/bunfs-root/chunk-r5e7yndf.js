// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{zt,U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{W}from"/$bunfs/root/chunk-cy8hxjse.js";import{g}from"/$bunfs/root/chunk-9c9242q9.js";class UVn{state={status:"inactive"};fallbackSadEmitted=new Set;toolsBaseline={captured:!1}}var Ldr=new zt(()=>new UVn);function o(){return Ldr.of(U())}function E0e(){return o().state}function Rcn(e){let t=o();if(t.state.status!=="inactive")return;t.state=e}function bte(e,t){let r=o();if(r.state.status==="reverted")return;if(r.state.status==="active")g("upgrade_teleport_cache",e),l(e);r.state={status:"reverted",reason:e,detail:t}}function dHe(e){let t=o();if(t.fallbackSadEmitted.has(e))return;t.fallbackSadEmitted.add(e),g("upgrade_teleport_cache",e),l(e)}function l(e){W("warn","cli_teleport_relay_fallback",{reason:e})}function Icn(e){let t=E0e();if(t.status!=="active")return!1;let r=t.preAnchorLineUuids;if(e.length<r.length)return bte("context_reduced",`live view has ${e.length} lines before its tail; the arm snapshot guarded ${r.length}`),!1;for(let a=0;a<r.length;a++)if(e[a]!==r[a])return bte("context_reduced",`pre-anchor line ${a} changed since arm`),!1;return!0}function xcn(e,t){let r=o();if(r.state.status!=="active")return!1;let a=r.toolsBaseline;if(!a.captured)return r.toolsBaseline={captured:!0,model:e,fingerprint:t},!0;if(e!==a.model)return dHe("model_mismatch"),!1;if(a.fingerprint===t)return!0;return bte("tools_changed",a.fingerprint===null?"session gained a toolset after a toolless first relay-attempted dispatch":t===null?"session lost its toolset after a tooled first relay-attempted dispatch":"outgoing toolset diverged from the first relay-attempted dispatch baseline"),!1}
export{UVn,Ldr,E0e,Rcn,bte,dHe,Icn,xcn};
