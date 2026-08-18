# brand/

This folder is a **one-way copy** from `tyler823/cortexfunnels`. Everything in it
was written somewhere else and copied down to here. Changes flow in. They never
flow out.

## Never edit tokens.css in this folder

`tokens.css` holds every brand colour, font, type size, weight, tracking, line
height and radius as a CSS custom property. It is the single place those values
are defined for this whole site.

If you edit it here, two things happen. Your change lives in this project only,
so this site and every other JobDox site immediately disagree about the brand.
And the next time someone refreshes this copy, your change is silently wiped out
with no warning and no conflict to resolve.

The long comments inside the file are not filler. They record measured contrast
ratios and font metrics that explain why each value is the value it is. Read them
before you form an opinion about changing anything, and do not strip them.

## What to do instead

The chain runs in one direction:

    Job-Dox-Website (index.css, the :root block)
        into  cortexfunnels (brand/tokens.css)
            into  this repo (brand/tokens.css)

To change a token, change it at the top of that chain, on the marketing site.
Then re-copy it down: marketing site into `cortexfunnels`, and `cortexfunnels`
into here. Update the "Copied" date and source commit in the header comment at
the top of the file each time, so anyone can tell at a glance how stale this copy
is.

## Load order matters

`tokens.css` must be linked **before** any page stylesheet:

    <link rel="stylesheet" href="/brand/tokens.css">
    <link rel="stylesheet" href="/shell.css">
    <link rel="stylesheet" href="/site.css">

The page stylesheets do not define colours or sizes of their own. Every one of
their declarations reads a custom property that `tokens.css` defines, so
`tokens.css` has to have been parsed by the time the cascade reaches them. Link
it second and the page renders with every colour and size unset.

## The brand checker does not scan this folder

`tools/brand-check.mjs` deliberately skips `brand/`. That is not an oversight.
This folder is not this repo's to correct, and `tokens.css` legitimately contains
characters the checker bans elsewhere. If you ever find yourself editing the
checker to make a file in here pass, stop: the fix belongs upstream.
