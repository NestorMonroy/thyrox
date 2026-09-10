// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{_e}from"/$bunfs/root/chunk-x1rrg5j2.js";import"/$bunfs/root/chunk-jdw11prg.js";import"/$bunfs/root/chunk-56nvyfje.js";import"/$bunfs/root/chunk-1mrhsd7s.js";import{L,we}from"/$bunfs/root/chunk-x722nt0q.js";import"/$bunfs/root/chunk-kn2qhfka.js";import"/$bunfs/root/chunk-55w4bsdv.js";import"/$bunfs/root/chunk-9fysw8jv.js";import"/$bunfs/root/chunk-m92n5xra.js";import"/$bunfs/root/chunk-m7w5m1w6.js";import{q,Lt}from"/$bunfs/root/chunk-058caznt.js";import"/$bunfs/root/chunk-97tbrkcc.js";import{b,Y,t}from"/$bunfs/root/chunk-fzpv8ev5.js";import"/$bunfs/root/chunk-xmrr4sh8.js";import"/$bunfs/root/chunk-ras23w04.js";import"/$bunfs/root/chunk-6rkpsn9e.js";import"/$bunfs/root/chunk-ck0tqv1m.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import"/$bunfs/root/chunk-spz20jb6.js";import"/$bunfs/root/chunk-616tsvrd.js";import"/$bunfs/root/chunk-n8g979s0.js";import"/$bunfs/root/chunk-mxy52vze.js";import{qe}from"/$bunfs/root/chunk-zk8esmth.js";import"/$bunfs/root/chunk-bx79h7g8.js";import{YK}from"/$bunfs/root/chunk-k1wkanbv.js";import"/$bunfs/root/chunk-7y5wjz4e.js";import{Qu}from"/$bunfs/root/chunk-vdqz95a3.js";import"/$bunfs/root/chunk-5dw4kvcq.js";import"/$bunfs/root/chunk-gxyczd8c.js";import"/$bunfs/root/chunk-h96shwz8.js";import"/$bunfs/root/chunk-ptdm1fhw.js";import"/$bunfs/root/chunk-gzwhm5vd.js";import"/$bunfs/root/chunk-nwzn6gxv.js";import"/$bunfs/root/chunk-enjww0fp.js";import"/$bunfs/root/chunk-mzmfq60a.js";import"/$bunfs/root/chunk-ye42pw2j.js";import"/$bunfs/root/chunk-0dkpd8qq.js";import"/$bunfs/root/chunk-67nd7etf.js";import"/$bunfs/root/chunk-7xxnrgeg.js";import"/$bunfs/root/chunk-rahwxqh8.js";import"/$bunfs/root/chunk-m0a16ehy.js";import"/$bunfs/root/chunk-rjxafr3h.js";import"/$bunfs/root/chunk-1v541dwj.js";import"/$bunfs/root/chunk-21dppk21.js";import"/$bunfs/root/chunk-edmcaynh.js";import"/$bunfs/root/chunk-a7a5sap3.js";import"/$bunfs/root/chunk-7r03n5n9.js";import"/$bunfs/root/chunk-35w62chd.js";import"/$bunfs/root/chunk-9pd12rac.js";import"/$bunfs/root/chunk-8trhjkwe.js";import"/$bunfs/root/chunk-xfn8hpdj.js";import"/$bunfs/root/chunk-8mbwgjdd.js";import"/$bunfs/root/chunk-wxd1scze.js";import"/$bunfs/root/chunk-77152aqa.js";import"/$bunfs/root/chunk-33da912m.js";import"/$bunfs/root/chunk-x67fwt53.js";import"/$bunfs/root/chunk-5t2g7ar8.js";import"/$bunfs/root/chunk-pwdby7t2.js";import"/$bunfs/root/chunk-vv5g97a8.js";import"/$bunfs/root/chunk-a0qeq8pm.js";import"/$bunfs/root/chunk-9qgz04yg.js";import"/$bunfs/root/chunk-b5ax9mbm.js";import"/$bunfs/root/chunk-4z2eqcrq.js";import"/$bunfs/root/chunk-b3pxzdmn.js";import"/$bunfs/root/chunk-ta3hhm0z.js";import"/$bunfs/root/chunk-2yqsfgga.js";import"/$bunfs/root/chunk-trntcdrz.js";import"/$bunfs/root/chunk-nmde69vm.js";import"/$bunfs/root/chunk-3r19kwqx.js";import"/$bunfs/root/chunk-55t63zqr.js";import"/$bunfs/root/chunk-j2rxdvy0.js";import"/$bunfs/root/chunk-0xd0k64r.js";import{Ft}from"/$bunfs/root/chunk-1qpkzqbm.js";import{nKe}from"/$bunfs/root/chunk-5cgxykth.js";import{uSe}from"/$bunfs/root/chunk-jd6c9ray.js";import"/$bunfs/root/chunk-zc7jwbz1.js";import"/$bunfs/root/chunk-50etkfry.js";import"/$bunfs/root/chunk-c6eb44np.js";import"/$bunfs/root/chunk-nc8ww32a.js";import"/$bunfs/root/chunk-my1n9ey3.js";import"/$bunfs/root/chunk-v10h0yg2.js";import{readFile as F}from"fs/promises";import{basename as x,join as G}from"path";import{readdir as y,readFile as C,stat as _}from"fs/promises";import{extname as v,join as E}from"path";var T=52428800,S=200,g=60,D=/<command-name>\/([\w:-]+)<\/command-name>/g,A=/"name":"mcp__([^"]+?)__([^"]+)"/g,f='"content":"<command-name>/',R='"content":"<command-message>',k='"type":"tool_use"',N='"type":"custom-title"',O='"type":"pr-link"',M='"role":"user"',P=/"customTitle":"([^"]+)"/,I=/"prNumber":(\d+)/,U=/"role":"user"[^}]*"content":"([^"]+)"/;async function w(u,i){let o={slashCommandCounts:new Map,mcpServerCounts:new Map,sessionDescriptors:[],sessionFileCount:0},m=Date.now()-i*24*60*60*1000,h;try{h=await y(u)}catch(a){if(Lt(a))return o;throw a}let d=h.filter((a)=>v(a)===".jsonl"),p=(await Promise.all(d.map(async(a)=>{let l=E(u,a);try{let r=await _(l);if(!r.isFile()||r.mtimeMs<m||r.size>T)return null;return l}catch(r){if(Lt(r))return null;throw r}}))).filter((a)=>a!==null);for(let a of p){let l;try{l=await C(a,"utf-8")}catch(e){if(Lt(e))continue;throw e}o.sessionFileCount++;let r={prNumbers:[]};for(let e of l.split(`
`)){if(e.length<10)continue;if(e.includes(f)||e.includes(R))for(let n of e.matchAll(D)){let c=n[1];o.slashCommandCounts.set(c,(o.slashCommandCounts.get(c)??0)+1)}if(e.includes(k)&&e.includes('"name":"mcp__'))for(let n of e.matchAll(A)){let c=n[1];o.mcpServerCounts.set(c,(o.mcpServerCounts.get(c)??0)+1)}if(e.includes(N)){let n=P.exec(e);if(n)r.title=n[1]}if(e.includes(O)){let n=I.exec(e);if(n){let c=Number(n[1]);if(!r.prNumbers.includes(c))r.prNumbers.push(c)}}if(!r.firstMessage&&e.includes(M)&&!e.includes(f)&&!e.includes('"content":[')){let n=U.exec(e);if(n){let c=n[1].replace(/\\n/g," ").replace(/\\"/g,'"');if(c.length>3&&!c.startsWith("<"))r.firstMessage=c.slice(0,S)}}}if(r.title||r.prNumbers.length>0||r.firstMessage)o.sessionDescriptors.push(r)}if(o.sessionDescriptors.length>g)o.sessionDescriptors.sort((a,l)=>{let r=(a.title?2:0)+(a.prNumbers.length>0?1:0);return(l.title?2:0)+(l.prNumbers.length>0?1:0)-r}),o.sessionDescriptors=o.sessionDescriptors.slice(0,g);return o}var j=30;function W(u){try{return new URL(u).origin}catch{return}}async function B(u){try{let i=await F(G(u,".mcp.json"),"utf8"),o=Y(i);if(o&&typeof o==="object"&&"mcpServers"in o&&o.mcpServers&&typeof o.mcpServers==="object")return o.mcpServers}catch(i){if(!q(i))t(`team-onboarding: failed to read .mcp.json: ${i instanceof Error?i.message:String(i)}`,{level:"error"})}return{}}async function H(u){let i=_e(),o=Qu(i),m=await w(o,u),h=[...m.slashCommandCounts.entries()].sort((e,n)=>n[1]-e[1]).map(([e,n])=>({name:`/${e}`,count:n})),d=await B(i),p=[...m.mcpServerCounts.entries()].sort((e,n)=>n[1]-e[1]).map(([e,n])=>{let c=d[e];return{name:e,callCount:n,urlOrigin:typeof c?.url==="string"?W(c.url):void 0}}),a=(await qe("git",["config","user.name"],{cwd:i})).stdout.trim(),l=(await qe("git",["remote","get-url","origin"],{cwd:i})).stdout.trim();return{usageData:b({generatedBy:a||void 0,currentRepo:YK(l)??x(i),windowDays:u,sessionCount:m.sessionFileCount,slashCommands:h,mcpServers:p,sessionDescriptors:m.sessionDescriptors},null,2),sessionCount:m.sessionFileCount,slashCommandCount:m.slashCommandCounts.size,mcpServerCount:m.mcpServerCounts.size}}var K=`# Welcome to [Team Name]

## How We Use Claude

Based on [name]'s usage over the last [N] days:

Work Type Breakdown:
  [Category 1]  [ascii bar]  [N]%
  [Category 2]  [ascii bar]  [N]%
  [Category 3]  [ascii bar]  [N]%
  ...

Top Skills & Commands:
  [/command]  [ascii bar]  [N]x/month
  ...

Top MCP Servers:
  [Server]  [ascii bar]  [N] calls
  ...

## Your Setup Checklist

### Codebases
- [ ] [repo-name] \u2014 [repo url]
...

### MCP Servers to Activate
- [ ] [Server] \u2014 [what it's for]. [How to get access]
...

### Skills to Know About
- [/command] \u2014 [what it does, when the team uses it]
...

## Team Tips

_TODO_

## Get Started

_TODO_

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy \u2014 warm, conversational,
not lecture-y.

Open with a warm welcome \u2014 include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes \u2014 [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections \u2014 offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data \u2014 don't extrapolate them into a "team
workflow" narrative. -->`,z=`You are helping a power user generate an onboarding guide for teammates who are new to Claude Code. The guide will live in the team's onboarding docs and can be pasted into Claude for an interactive walkthrough.

You're co-authoring this with them \u2014 collaborative and helpful, like a teammate who's done this before and is happy to share.

## Usage data (last {{WINDOW_DAYS}} days)

This was scanned from the guide creator's local Claude Code transcripts:

\`\`\`json
{{USAGE_DATA}}
\`\`\`

## Your task

Before anything else \u2014 including before thinking through the classification \u2014 output exactly this line as your first visible text:

> Looking at how you've used Claude over the last {{WINDOW_DAYS}} days to put together an onboarding guide for teammates new to Claude Code.

This must come before any extended thinking about session descriptors. The guide creator is staring at a blank screen until you do. Classification is step 2, not step 1.

Generate the guide immediately, then ask for revisions. Don't wait for answers first \u2014 it's easier for the guide creator to edit a concrete draft than answer abstract questions.

1. **Output the acknowledgment line above.** No thinking, no classification, no tool calls before this. One line, then move on.

2. **Derive the work-type breakdown.** Read the \`sessionDescriptors\` array \u2014 each entry describes one session via its title, any linked code reviews (\`prNumbers\`), and first user message. Classify each session into one of these task types:

   - **build_feature** \u2014 new functionality, scripts, tools, config/CI/env setup
   - **debug_fix** \u2014 investigating and fixing bugs
   - **improve_quality** \u2014 refactoring, tests, cleanup, code review
   - **analyze_data** \u2014 queries, metrics, number crunching
   - **plan_design** \u2014 architecture, approach, strategy, understanding unfamiliar code, design review
   - **prototype** \u2014 spikes, POCs, throwaway exploration
   - **write_docs** \u2014 PRDs, RFCs, READMEs, design docs, copy/doc review

   Categories describe the *type of task*, not the project or domain \u2014 a teammate on any project should recognize them. Review sessions belong with whatever's being reviewed: code review is improve_quality, doc review is write_docs, design review is plan_design. Most sessions fit the list; only invent a new category if it's genuinely a different type of task. Pick the top 3-5 with rough percentages. First messages alone are usually enough; titles and code-review links are enrichment. If first messages are uninformative, use tool and MCP counts as a weak hint. If there are ~0 sessions, leave the breakdown as a TODO.

   In the rendered guide, display categories with spaces and title case (e.g. "Build Feature" not "build_feature").

3. **Gather the remaining pieces.** For repos, start with \`currentRepo\` and check the workspace for sibling repo directories. For MCP server setup, use each entry's \`name\` (and \`urlOrigin\` where present) to infer what the server does and how a teammate would get access. Leave the Team Tips and Get Started sections as TODO placeholders \u2014 you'll ask for these in Review and fill them in after.

4. **Write the guide to \`ONBOARDING.md\`** following this template:

\`\`\`
{{GUIDE_TEMPLATE}}
\`\`\`

   Fill in real numbers from the usage data (not placeholders). Use \`generatedBy\` for the name; if it's missing, omit the name. Ascii bar charts: \`\u2588\` for filled, \`\u2591\` for empty, 20 chars wide. Keep the HTML comment instruction at the bottom exactly as shown.

5. **Render the guide in a code block, then close out the first turn.** You're co-authoring this guide with the guide creator \u2014 frame the follow-up as collaboration, not corrections.

   After the code block, add a \`---\` horizontal rule and a \`**Review**\` heading so the guide is visually separated from your questions. Under the heading, number these three questions:

   1. "I went with '[X]' for the team name \u2014 let me know if that sounds right." (or if you couldn't tell: "What's the team name? I'll add it in.")
   2. Is there a starter task for someone new to Claude Code? (ticket or doc link \u2014 optional)
   3. Any team tips you'd tell a new teammate that aren't already in CLAUDE.md?

   After they answer, update \`ONBOARDING.md\` with their team name, tips, and starter task. Then close with this exact line (not numbered, not paraphrased):

   Saved to \`ONBOARDING.md\`. Drop it in your team docs and channels \u2014 when a new teammate pastes it into Claude Code, they get a guided onboarding tour from there.

   Apply any edits they come back with to the file.`,X=`

**Sharing** \u2014 call the ${nKe} tool twice:

1. **Right after rendering the draft code block** (still in step 5, before the Review questions). Call with \`mode='check'\` \u2014 this uploads the draft to an existing guide (or creates a new one). Either way you get a \`share_url\` and \`short_code\`. Instead of the \`---\` / \`**Review**\` header from step 5, bridge directly from the link into the numbered questions (no horizontal rule):

   Here's a draft \u2014 a few quick questions to finish it up:

   <share URL>

   Then ask the three numbered questions from step 5 as normal. Save the \`short_code\` from the tool result \u2014 you'll need it in step 2.

2. **After the user answers the Review questions** and you've updated ONBOARDING.md, call it again with \`mode='update'\` and the \`short_code\` from step 1 to refresh the same link. Replace step 5's "drop it in your team docs" close with:

   Here's your onboarding guide: <updated URL>

   Send this to teammates and they'll get a guided walkthrough when they open it in Claude Code.

If the tool returns 'unavailable' at any point, skip that call and use the manual close from step 5 instead.`,J=["Edit(ONBOARDING.md)","Bash(ls *)",nKe],V={type:"prompt",name:"team-onboarding",description:"Help teammates ramp on Claude Code with a guide from your usage",allowedTools:J,contentLength:0,isEnabled:()=>Ft("allow_team_onboarding"),policyGate:{policy:"allow_team_onboarding",featureLabel:"Team onboarding"},isHidden:!1,progressMessage:"scanning usage data",effort:"low",requires:{workspace:!0},userFacingName(){return"team-onboarding"},source:"builtin",disableModelInvocation:!0,async getPromptForCommand(u,i){let o=L("tengu_flint_harbor_prompt",{}),m=typeof o?.prompt==="string"?o.prompt:z,h=typeof o?.guideTemplate==="string"?o.guideTemplate:K,d=typeof o?.windowDays==="number"?Math.min(Math.max(Math.floor(o.windowDays),1),365):j;s("tengu_team_onboarding_invoked",{window_days:d}),await we((n)=>({...n,teamOnboardingLastUsedAt:Date.now()}),i.storageV5);let{usageData:p,sessionCount:a,slashCommandCount:l,mcpServerCount:r}=await H(d),e=m.replaceAll("{{WINDOW_DAYS}}",String(d)).replaceAll("{{GUIDE_TEMPLATE}}",h).replaceAll("{{USAGE_DATA}}",p)+(uSe()?X:"");return s("tengu_team_onboarding_generated",{session_count:a,slash_command_count:l,mcp_server_count:r,window_days:d}),[{type:"text",text:e}]}},Ce=V;export{Ce as default};
