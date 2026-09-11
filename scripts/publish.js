// 프로필 저장소를 만들고 현재 디렉터리 내용을 밀어 올린다.
// 이 저장소(axhub-axdiag)와는 무관한 별개 체크아웃이다.
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USER = 'Hyungjuk42';
const REPO = `${USER}/${USER}`;

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  return execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
}

function tryRun(cmd, args) {
  try {
    return { ok: true, out: run(cmd, args) };
  } catch (err) {
    return { ok: false, out: (err.stdout || '') + (err.stderr || '') };
  }
}

// 1. 원격 저장소가 이미 있는지 확인한다. 있으면 만들지 않는다.
const exists = tryRun('gh', ['api', `repos/${REPO}`, '--jq', '.full_name']);
if (exists.ok) {
  console.log(`remote already exists: ${exists.out.trim()}`);
} else {
  console.log('remote not found, creating public profile repo');
  run('gh', [
    'repo',
    'create',
    REPO,
    '--public',
    '--description',
    'Profile README',
  ]);
}

// 2. 로컬 저장소 초기화 (이미 있으면 건너뛴다)
if (!tryRun('git', ['rev-parse', '--git-dir']).ok) {
  run('git', ['init', '-b', 'main']);
}

const remotes = tryRun('git', ['remote']);
if (!remotes.out.split('\n').includes('origin')) {
  run('git', ['remote', 'add', 'origin', `https://github.com/${REPO}.git`]);
}

run('git', ['add', '-A']);

const staged = tryRun('git', ['diff', '--cached', '--name-only']);
if (!staged.out.trim()) {
  console.log('nothing staged, skipping commit');
} else {
  run('git', [
    'commit',
    '-m',
    'Add profile README with stats, featured projects and snake animation',
  ]);
}

run('git', ['branch', '-M', 'main']);
console.log(run('git', ['push', '-u', 'origin', 'main']));
console.log('pushed');
