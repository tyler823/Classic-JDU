/* Brand check. Run with: node tools/brand-check.mjs
   Exits 1 on any finding, so it can gate a build.

   What it enforces, all from brand/BRAND.md:

     Section 4  Zero em-dashes and zero en-dashes. The brand rule covers strings
                a customer can see, including alt text and metadata, and exempts
                verbatim customer quotes. This check is stricter: it bans both
                characters anywhere in the files it scans, comments included.
                A page with none at all cannot regress into one with some, and
                nothing here needs either character.
     Section 4  Zero emoji.
     Section 1  The seven retired product names, in visible copy. Internal route
                keys, storage keys, filenames and component names keep their
                legacy names on purpose, so this only scans the funnel's own
                source, where no such identifier exists.
     Section 1  "AI-powered". The descriptor is AI-native, always.
     Section 1  "Star Restoration". The restoration company is Mr. Restore.
     Section 1  "Job-Dox" outside its two permitted roles: the legal entity
                Job-Dox LLC and the info@job-dox.com address.

   brand/ is not scanned. It is a one-way copy from Job-Dox-Website and is not
   this project's to correct.
*/

import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
/* This repo is one page at the root plus tools/, so the root walked recursively
   is the whole scan. SKIP_DIRS below is what keeps brand/ out of it. */
const SCAN_DIRS = ['.'];
const SCAN_EXTENSIONS = ['.html', '.css', '.js', '.mjs'];

/* This file has to spell out every banned string in order to look for it, so
   it is the one file that cannot be scanned by itself. */
const SKIP_FILES = ['tools/brand-check.mjs'];

/* Directories the walk never enters. brand/ is the load bearing one, and it is
   the reason this constant exists at all: it is a one-way copy that is not this
   repo's to correct, and tokens.css legitimately carries em-dashes that every
   rule below would flag. Scanning the root without this would fail the check on
   a file we are forbidden to fix. .git and node_modules are here because the
   scan root is now the repo root, so the walk would otherwise reach them. */
const SKIP_DIRS = ['.git', 'brand', 'node_modules'];

const RETIRED_NAMES = [
  'DryDox', 'ContentsDox', 'EstimateDox', 'MarketDox',
  'SalesDox', 'RoofingDox', 'MindFlow'
];

/* The third permitted role for the hyphenated spelling: the funnel host.
   This site is served at cortex.job-dox.ai, and this assessment at
   cortex.job-dox.ai/ai-readiness/, so the string has to be writable in a
   canonical, an og:url and a comment explaining either.

   That host is an existing DNS name. It predates the naming ruling that made
   JobDox the brand form, and renaming live DNS to match a copy rule is not a
   trade worth making. JobDox unhyphenated remains the brand form in all copy:
   this exemption is for the address of a machine, not for prose. If it starts
   appearing in a sentence a customer reads, that is a copy bug, not a reason to
   widen this list.

   classic.job-dox.ai is the same case: the Classic documentation site. It is a
   second exact literal rather than a widened pattern, because a pattern such as
   /\w+\.job-dox\.ai/ would exempt every future subdomain in advance, including
   ones nobody has reviewed. Add hosts one at a time, by hand.

   Each entry is masked out of a line before any rule sees it, matched as an
   exact literal and case-insensitively, so Cortex.Job-Dox.ai is covered as well
   as the lowercase form. Nothing broader is permitted: `job-dox.ai` on its own,
   or any other subdomain of it, still trips the rule below. Masking preserves
   length, so every other rule still sees the rest of the line unchanged and
   reports the same line number. */
const ALLOWED_LITERALS = ['cortex.job-dox.ai', 'classic.job-dox.ai'];

const ALLOWED_PATTERN = new RegExp(
  ALLOWED_LITERALS.map(function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'),
  'gi'
);

function maskAllowed(line) {
  return line.replace(ALLOWED_PATTERN, function (m) { return 'x'.repeat(m.length); });
}

const RULES = [
  { name: 'em-dash', pattern: /—/g, note: 'Zero em-dashes, section 4.1.' },
  { name: 'en-dash', pattern: /–/g, note: 'Zero en-dashes, section 4.1.' },
  {
    name: 'emoji',
    pattern: /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu,
    note: 'Zero emoji, section 4.1.'
  },
  { name: 'AI-powered', pattern: /AI[\s-]powered/gi, note: 'The descriptor is AI-native, section 1.4.' },
  { name: 'Star Restoration', pattern: /Star\s+Restoration/gi, note: 'The restoration company is Mr. Restore, section 1.3.' },
  {
    name: 'retired product name',
    pattern: new RegExp('\\b(' + RETIRED_NAMES.join('|') + ')\\b', 'g'),
    note: 'Use the allow-list names, section 1.1.'
  },
  {
    /* Job-Dox is legitimate in exactly three roles now: the legal entity, the
       address, and the funnel host in ALLOWED_LITERALS above. Anything else
       should read JobDox. The two negative lookaheads let the first two through;
       the host is handled by masking, before this rule ever sees the line.

       THE BRAND TOKEN IS MATCHED IN EITHER CASE, the lookaheads are not, and
       that asymmetry is deliberate. This rule was `/Job-Dox/`, which meant a
       lowercase `job-dox` anywhere in copy was never caught at all: the check
       silently passed the exact spelling it exists to prevent. Widening the
       token to [Jj]ob-[Dd]ox closes that. It is a tightening, not a loosening,
       and it is what makes the host allow list load bearing rather than
       decorative, since the host is written lowercase.

       The lookaheads stay case-sensitive on purpose. Under a blanket /i flag
       `job-dox llc` would satisfy `(?!\s+LLC)` and pass, and a mis-cased legal
       entity is a copy error that should be reported, not exempted. */
    name: 'Job-Dox outside its three permitted roles',
    pattern: /[Jj]ob-[Dd]ox(?!\s+LLC)(?!\.com)/g,
    note: 'The brand is JobDox. Job-Dox is the legal entity, the address and the funnel host only, section 1.2.'
  }
];

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    return out;
  }
  entries.forEach(function (entry) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.includes(entry)) return;
      walk(full, out);
    } else if (SCAN_EXTENSIONS.includes(extname(full))) {
      out.push(full);
    }
  });
  return out;
}

const files = SCAN_DIRS.reduce(function (acc, dir) {
  return walk(join(ROOT, dir), acc);
}, []).filter(function (file) {
  return !SKIP_FILES.includes(relative(ROOT, file));
});

const findings = [];

files.forEach(function (file) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach(function (raw, i) {
    const line = maskAllowed(raw);
    RULES.forEach(function (rule) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(line)) !== null) {
        findings.push({
          file: relative(ROOT, file),
          line: i + 1,
          rule: rule.name,
          found: match[0],
          note: rule.note
        });
        if (match.index === rule.pattern.lastIndex) rule.pattern.lastIndex += 1;
      }
    });
  });
});

if (findings.length === 0) {
  console.log('brand-check: ' + files.length + ' files scanned, no findings.');
  process.exit(0);
}

findings.forEach(function (f) {
  console.log(f.file + ':' + f.line + '  ' + f.rule + '  found "' + f.found + '"  ' + f.note);
});
console.log('\nbrand-check: ' + findings.length + ' finding(s) across ' + files.length + ' files.');
process.exit(1);
