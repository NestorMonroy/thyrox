// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{sa}from"/$bunfs/root/chunk-ay603yys.js";import{iOt,WSo,XA,le}from"/$bunfs/root/chunk-5khn4tvf.js";import{Tr,O0t,ZS}from"/$bunfs/root/chunk-pw35yar9.js";import{hA,G1,Ju}from"/$bunfs/root/chunk-4n4g22z6.js";import{Gve}from"/$bunfs/root/chunk-fxt3hn7r.js";function $ne(){let e=ZS(),o=G1.flatMap((t)=>Ju(t).errors.map((i)=>i.file?i:{...i,file:hA(t)})),r=le(),s=Gve.filter((t)=>e.settings[t]===void 0&&r[t]!==XA[t]&&WSo(t,r[t])).map((t)=>({file:sa(),path:t,message:iOt(t)?"Not a valid value for this setting, so it is ignored and the setting counts as off":"Not a valid value for this setting, so it is ignored and the setting counts as unset",severity:"warning",suggestion:"Set it with /config, or delete the key from this file"}));return{settings:e.settings,errors:[...e.errors,...o,...s]}}function aSt(){return O0t().filter((e)=>!e.preserveOnWrite)}function nje(){let e=Tr("localSettings");return[...$ne().errors.filter((r)=>!r.mcpErrorMetadata&&r.severity!=="warning"&&r.file!==e),...aSt()]}
export{$ne,aSt,nje};
