// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Lt}from"/$bunfs/root/chunk-gx4tznbd.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{P1}from"/$bunfs/root/chunk-esk1bxsv.js";import{py}from"/$bunfs/root/chunk-20q5babf.js";import{Ose}from"/$bunfs/root/chunk-xvt6q4jb.js";import{DBt}from"/$bunfs/root/chunk-t13sjz5v.js";var s="save_skill",i=`# Saving skills

To create a skill for the user, or update one they ask to change, use the \`${s}\` tool. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them does not change the user's saved skill.`,l=`# Saving skills

To create a skill for the user, or change one they ask to change, call the \`${Ose}\` tool: it shows them a review card where they can save it. When the user wants a skill added or updated, the proposal is the deliverable \u2014 draft the content any way that helps, then propose it; don't send them a SKILL.md or a packaged skill file to save themselves. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a new skill file, does not change the user's skills. When the user saves a proposal it replaces that skill's whole SKILL.md. To change an existing skill, read its current SKILL.md first and propose the complete updated file.`,o=`# Saving skills

To create a skill for the user, or change one of their existing skills, write the complete skill as a single \`SKILL.md\` (or a packaged \`.skill\` zip archive) and send it to them with the \`${py}\` tool \u2014 the delivered file may give them an option to save it as a skill, depending on their organization's settings. You get no signal whether they saved it: report the skill as delivered, never as saved. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a skill file without sending it, does not change the user's skills. A SKILL.md or .skill file named like one of the user's existing skills replaces that skill entirely if they save it, so start from the skill's current SKILL.md and deliver the complete updated file, never only the changes.`,n=`# Saving skills

Skills can't be created or changed from here. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a new skill file, does not change the user's skills. If asked to create or change a skill, say plainly that you can't do that here and point the user to their claude.ai settings.`,r=` Skills that are part of an installed plugin are the exception: if this session includes the \`${DBt}\` skill, customize those through it \u2014 it edits the plugin and repackages it.`;function Une(t){if(!P1()&&!a.CLAUDE_CODE_SKILL_PROPOSALS)return null;return(t.some((e)=>Lt(e,s))?i:t.some((e)=>Lt(e,Ose))?l:t.some((e)=>Lt(e,py))?o:n)+r}
export{Une};
