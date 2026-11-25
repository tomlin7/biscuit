import { randomBytes } from 'node:crypto'

async function gh(args: string[]): Promise<string> {
  const child = Bun.spawn(['gh', ...args], { stdout: 'pipe', stderr: 'pipe', windowsHide: true })
  const timer = setTimeout(() => child.kill(), 30000)
  try {
    const [out, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
    if (code) throw new Error(`External reachability GitHub command failed: ${error.slice(0,500)}`)
    return out
  } finally { clearTimeout(timer) }
}
/** A cloud runner receives only a public URL and correlation ID, never credentials. */
export async function externalReachability(origin: string, ref: string): Promise<string> {
  const id = randomBytes(8).toString('hex'), repo = 'hiroshi-os/Hiroshi'
  await gh(['workflow', 'run', 'ci.yml', '--repo', repo, '--ref', ref, '-f', `remote_url=${origin}`, '-f', `probe_id=${id}`])
  const deadline = Date.now() + 180000
  let runID: number | undefined
  while (Date.now() < deadline) {
    const runs = JSON.parse(await gh(['run', 'list', '--repo', repo, '--workflow', 'ci.yml', '--branch', ref, '--event', 'workflow_dispatch', '--limit', '10', '--json', 'databaseId,displayTitle,status,conclusion'])) as { databaseId: number; displayTitle: string; status: string; conclusion: string }[]
    const run = runs.find((run) => run.displayTitle === `Remote reachability ${id}`)
    if (run) runID = run.databaseId
    if (run) {
      const details = JSON.parse(await gh(['run', 'view', String(run.databaseId), '--repo', repo, '--json', 'jobs'])) as { jobs: { name: string; status: string; conclusion: string }[] }
      const probe = details.jobs.find((job) => job.name === 'independent network reachability')
      if (probe?.status === 'completed') {
        if (probe.conclusion !== 'success') throw new Error(`Independent reachability failed: https://github.com/${repo}/actions/runs/${run.databaseId}`)
        return `https://github.com/${repo}/actions/runs/${run.databaseId}`
      }
    }
    await Bun.sleep(3000)
  }
  if (runID) await gh(['run', 'cancel', String(runID), '--repo', repo]).catch(() => {})
  throw new Error(`Independent reachability timed out; inspect the workflow named Remote reachability ${id}.`)
}
