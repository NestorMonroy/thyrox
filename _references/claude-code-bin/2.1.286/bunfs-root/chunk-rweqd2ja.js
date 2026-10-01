// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ke}from"/$bunfs/root/chunk-hbjpbz2q.js";import{at}from"/$bunfs/root/chunk-bg5yf16b.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{fO}from"/$bunfs/root/chunk-wk88sc60.js";var nNt=1500,c=3000;function rut(){return a.CLAUDE_CODE_REMOTE&&ke()}function qdn(){return rut()&&fO()}function i0o({eventLoggingEnabled:e,growthBookEnabled:t,cacheEmpty:n,relaunches:o}){let r=e&&n?nNt:0,u=t&&o?a.CLAUDE_CODE_FLAG_FETCH_WAIT_MS??c:0,i=Math.max(r,u);return i>0?i:void 0}function a0o({nonInteractive:e,budgetMs:t,settingsEnvPending:n,cacheEmpty:o,warmWakeEarlyFetch:r}){return e&&t!==void 0&&!n&&(o||r)}function l0o({nonInteractive:e,budgetMs:t,settingsEnvPending:n,cacheEmpty:o,relaunches:r,autoModeKillSwitchOnDisk:u,warmWakeEarlyFetch:i}){if(t===void 0)return;if(e&&!n&&(o||r&&(u||!i)))return"gb-before-mode";return r?"gb-before-context":"gb-before-tools"}async function c0o({initialize:e,budgetMs:t}){let n=performance.now(),o=await at(e().then(()=>!0,()=>!0),t);return{waitMs:performance.now()-n,timedOut:o===void 0}}
export{nNt,rut,qdn,i0o,a0o,l0o,c0o};
