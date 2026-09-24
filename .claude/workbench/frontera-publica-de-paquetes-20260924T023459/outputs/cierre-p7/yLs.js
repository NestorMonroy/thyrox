function yLs(e){if(e.isSubAgent)return[];let n=e.planExists?`A plan file already exists at ${e.planFilePath}. You can read it and make incremental edits using the ${Lt} tool.`:`No plan file exists yet. You should create your plan at ${e.planFilePath} using the ${vn} tool.`,r=!e.workshopOfferDocPath&&e.workshopActiveDocPath?`

A decision workshop is in progress for this session \u2014 exactly as granted when the workshop began, ${tEt(e.workshopActiveDocPath,{form:"full",mode:"active"})} Fold each resolved decision back into the plan file as the workshop progresses.`:"";if(e.customInstructions){let O=`${Aar}

## Plan File Info:
${n}
You should build your plan incrementally by writing to or editing this file. NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.${r}

## Plan Workflow

${e.customInstructions}

### Call ${Wu}
${Par(e.workshopActiveDocPath)}`;return Sl([Ae({content:O,isMeta:!0})])}let{phase1:s,phase2:g}=gLs(),h=e.workshopOfferDocPath?`

## Interactive Workshop Option

The workshop skill is available in this session. Once you understand the request well enough to see its design decisions, judge whether this task has substantive decision points \u2014 multiple viable approaches where the user's choice shapes the plan. If it does, offer the workshop once, via ${Ps}, at a natural early moment \u2014 typically alongside your first clarifying questions, or when the first real design decision surfaces: the user can plan through an interactive workshop, a published page where they click through each open decision in their browser and their choices flow back into this session. Describe the offer in those product terms \u2014 what the user will experience, never the machinery underneath. If the task has no real decision points, do not offer, and do not mention the workshop at all.

If the user accepts: invoke the workshop skill (${mo} tool), create the workshop document at ${e.workshopOfferDocPath}, and seed it from the planning context so far \u2014 the task summary, what exploration has established, and the open decisions. The plan file remains the canonical plan: fold each resolved decision back into it as the workshop progresses, and finish the planning workflow (ending with ${Wu}) as normal once the decisions are settled. Once the workshop document exists, the end-turn rule in these reminders gains a third option (publishing the document so the user can take decisions on the page) \u2014 follow the rule as stated in each reminder.

If the user declines: continue planning normally and do not raise the workshop again this session.

This placement supersedes the workshop skill's default placement step (scratchpad / do_not_commit): in plan mode the document lives beside the plan file so the write carve-out and collision reservations cover it.

This narrowly extends the plan-mode file exception above: ${tEt(e.workshopOfferDocPath,{form:"full",mode:"offer"})}`:"",y=e.prototypeOffer?`

## Prototype Artifact Option

The prototype skill is available in this session. Offer it at most once, as one short line via ${Ps} at a natural early moment, then stop and wait; if the user declines, continue planning and do not raise prototyping again this session. Make the offer only when the plan is for a new product or UI idea with nothing in the repository to modify yet \u2014 a greenfield build still proving what it should be \u2014 where a working proof-of-concept Artifact the user can open and react to would settle the idea better than a plan on paper. If the plan works within existing code, or the user has asked for the real implementation, do not offer, and do not mention prototyping at all.

If the user accepts: the prototype is built after plan mode ends, never during it \u2014 plan mode stays read-only except the plan file. Write a short plan to the plan file naming the prototype-first approach (prototype the idea as a working Artifact to validate it, then plan the real build from what it proves), present it with ${Wu}, and once the user approves and plan mode has ended, invoke the prototype skill to build and publish it.`:"",w=`${Aar}

## Plan File Info:
${n}
You should build your plan incrementally by writing to or editing this file. NOTE that this is the only file you are allowed to edit - other than this you are only allowed to take READ-ONLY actions.${h}${r}${y}

## Plan Workflow

${s}

${g}

${hLs}

${mLs(e.workshopOfferDocPath!==void 0||e.workshopActiveDocPath!==void 0)}

### Phase 5: Call ${Wu}
${Par(e.workshopActiveDocPath)}

NOTE: At any point in time through this workflow you should feel free to ask the user questions or clarifications using the ${Ps} tool. Don't make large assumptions about user intent. The goal is to present a well researched plan to the user, and tie any loose ends before implementation begins.`;return Sl([Ae({content:w,isMeta:!0})])}