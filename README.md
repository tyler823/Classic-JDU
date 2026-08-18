# Classic JDU

The training guide library for **JobDox Classic**, served at
**https://classic.job-dox.ai**.

It is one page: a left sidebar listing eight categories with a search box, and a
main column of 41 guide cards grouped into those same eight sections. Each card
opens a step by step guide or a video in a new tab. The guides themselves live on
Scribe, YouTube and Google Drive; this site is the index that makes them findable.

## Why this is its own site

Classic is the legacy product. Cortex is the current one. Keeping the Classic
documentation on its own host, with its own look and its own name, means a
customer still running Classic can find help without being walked through a
product they are not using, and without being sold to while they are trying to
get a job done.

That separation is a rule, not a preference. **This site carries no Cortex
branding, no Cortex logo and no Cortex product names.** There is no logo file in
this repository at all: the wordmark in the header is set from type, which is
deliberate, because a wordmark made of text cannot quietly turn into the wrong
brand the way a copied image file can. If you find yourself wanting to add a
logo, that is the moment to ask whether the change belongs on this site.

## There is no build step

This is plain HTML and CSS. Nothing is compiled, bundled or generated. To make a
change you edit the file, commit it, and push. Netlify notices the push and
publishes what you committed, usually within a minute.

That means there is no way for the published site to differ from what is in this
repository, and no build to break. It also means a mistake goes live as fast as a
fix does, so read your change before you push it.

One thing worth knowing: because the whole repository is published, every file in
it is a public web address. That includes this README. Nothing here is secret, so
that is fine, but do not put anything in this repository that should not be read
by a stranger.

## Checking the brand rules

There is a small script that reads every page and stylesheet and looks for things
the brand rules forbid: em-dashes and en-dashes, emoji, retired product names,
the phrase "AI-powered" where it should read "AI-native", and the hyphenated
spelling of the company name outside the few places it is allowed.

Run it like this:

    node tools/brand-check.mjs

It prints one line per problem, naming the file and the line number, and it stops
the build if it finds anything. If it prints nothing but a count, everything
passed.

If it reports something, fix the file it names. **Do not edit the script to make
the problem go away.** The script is the record of what the rules are.

## The brand folder is a copy, not a source

Everything in `brand/` was written somewhere else and copied down to here.
`brand/tokens.css` holds every colour, font and size the site uses, and it is a
one-way copy from the `cortexfunnels` repository, which took it from the
marketing site before that.

**Never edit `brand/tokens.css` in this repository.** An edit made here survives
only until the next time somebody refreshes the copy, at which point it vanishes
with no warning. To change a colour or a size, change it on the marketing site
and then re-copy it down the chain. `brand/README.md` explains how.

## Where the content came from

The 41 guides and the eight categories were not written for this site. They were
extracted from the Classic training guides section of `university.html` in the
`tyler823/Job-Dox-Website` repository, specifically **lines 1488 to 1692** of that
file, which held the section headings, the card titles and the destination links.

Nothing was deleted from that repository when this site was built. The original
still exists there. If a card title or a link here looks wrong, that file is
where to check it against.

One thing was deliberately changed rather than copied. In the original, one
section of Classic drying guides was headed with a Cortex product name. Genuine
Classic content sat under a heading naming a product those customers do not have.
That heading was replaced here with a plain description of what the guides
actually cover, which is the kind of correction this site exists to make possible.
