import { createPromptStore } from '../../../src/shell/prompt-store'
const [home, cwd, id] = process.argv.slice(2) as [string, string, string]
const store = createPromptStore({ cwd, id }, home)
const edited = store.edit('saved before exit 漢🙂', 0)
store.stage(edited.revision, 'queue', 'local/echo')
// No close/cleanup callback: committed local input must outlive the process.
process.exit(0)
