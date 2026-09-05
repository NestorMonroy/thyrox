// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{q9c as o,s9c as c}from"/$bunfs/root/_772.js";import{xxd as i}from"/$bunfs/root/_837.js";function a(t){let r=t.match(/^([A-Z]):(.*)$/i);if(!r)return null;return`/mnt/${r[1].toLowerCase()}${r[2].replaceAll("\\","/")}`}class l{wslDistroName;constructor(t){this.wslDistroName=t}async toLocalPath(t){if(!t)return t;if(this.wslDistroName){let s=t.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);if(s&&s[1]!==this.wslDistroName)return t}let{stdout:r,code:e}=await o("wslpath",["-u",t],{useCwd:!1}),n=r.trim();if(e===0&&n)return n;return a(t)??t.replaceAll("\\","/")}async toIDEPath(t){if(!t)return t;let{stdout:r,code:e}=await o("wslpath",["-w",t],{useCwd:!1}),n=r.trim();if(e===0&&n)return n;return t}}function h(t,r){let e=t.match(/^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(.*)$/);if(e)return e[1]===r;return!0}var u=i(()=>{c()});
export{a as oxb,l as pxb,h as qxb,u as rxb};
