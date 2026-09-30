import { Command, type OptionValues } from '@commander-js/extra-typings'
const typed = new Command().argument('[prompt]', 'p').option('-d, --debug', 'd').option('--file <f...>', 'f')
function takesLoose(program: Command): void {
  program.command('mcp')
}
takesLoose(typed)
