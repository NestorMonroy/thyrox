// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ADe}from"/$bunfs/root/chunk-tenqvr1v.js";import{E$n,kEr,k$n,T$n,A$n}from"/$bunfs/root/chunk-cspjdhfb.js";import{uQt,Qdo,Zdo,J2e}from"/$bunfs/root/chunk-2t7v5npn.js";var n=[Zdo,uQt];function Exe(e){if(e===null)return{tagsRead:!1,rcChild:!1,projectThreadChild:!1,attended:!1};let t=!1;t=e.includes("hearth-rc-child");let l=e.includes(Qdo);return{tagsRead:!0,rcChild:l,projectThreadChild:t,attended:e.some((o)=>n.includes(o))&&!l&&!e.includes(J2e)}}function nGt(e){if(E$n()||k$n())return!0;return A$n()||e==="spawn"&&T$n()}function rGt(e){let t=e.roles.rcChild&&!e.modePinned&&E$n(),l=t&&kEr()&&ADe(e.settings()),o=e.roles.attended,r=!1,a=!1;o=o||e.roles.projectThreadChild,r=e.roles.projectThreadChild&&T$n(),a=e.roles.projectThreadChild&&A$n();let d=o&&k$n();return{autoDefault:t,autoOverSettings:l,artifact:d,machineSettings:r,autoCompact:a}}
export{Exe,nGt,rGt};
