{
  line = $0
  line = gensub(/Claude Code/, "thyrox", "g", line)
  line = gensub(/ClaudeMessage/, "MessagesApiMessage", "g", line)
  line = gensub(/claudeMessage/, "messagesApiMessage", "g", line)
  line = gensub(/([A-Za-z_])Claude/, "\\1Messages", "g", line)
  line = gensub(/Claude([A-Z])/, "Messages\\1", "g", line)
  line = gensub(/(^|[^A-Za-z0-9_.~\/-])claude([A-Z])/, "\\1messages\\2", "g", line)
  line = gensub(/\<Claude\>/, "Mensajes", "g", line)
  print line
}
