// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Q0e}from"/$bunfs/root/chunk-620cda50.js";import{I0n,Jhr,P0n,H0n}from"/$bunfs/root/chunk-qadnycav.js";import{C9t,mso,gso,gGe}from"/$bunfs/root/chunk-894gg0xt.js";var a=[gso,C9t];function JCe(e){if(e===null)return{tagsRead:!1,rcChild:!1,projectThreadChild:!1,attended:!1};let t=!1;t=e.includes("hearth-rc-child");let r=e.includes(mso);return{tagsRead:!0,rcChild:r,projectThreadChild:t,attended:e.some((o)=>a.includes(o))&&!r&&!e.includes(gGe)}}function ljt(e){if(I0n()||P0n())return!0;return e==="spawn"&&H0n()}function cjt(e){let t=e.roles.rcChild&&!e.modePinned&&I0n(),r=t&&Jhr()&&Q0e(e.settings()),o=e.roles.attended,l=!1;o=o||e.roles.projectThreadChild,l=e.roles.projectThreadChild&&H0n();let n=o&&P0n();return{autoDefault:t,autoOverSettings:r,artifact:n,machineSettings:l}}
export{JCe,ljt,cjt};
