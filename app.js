/* Guides page behaviour: search filtering, and sidebar highlighting on scroll.

   Plain script. No framework, no modules, no imports, no build step, and no
   network request of any kind, so nothing here needs a CSP directive. No
   localStorage, no sessionStorage and no cookies: the page holds no state worth
   remembering between visits, and a filter that restored itself on return would
   hide guides a reader did not ask to hide.

   EVERYTHING SHOWS AND HIDES THROUGH THE hidden PROPERTY. Never style.display,
   never a class. shell.css carries [hidden] { display: none !important; }
   precisely so this works, and that !important is there because the browser's
   own [hidden] rule is a user agent rule and loses to any author rule that sets
   display, at any specificity. Two real bugs in cortexfunnels came from exactly
   that: a form that stayed submittable after a successful send, and a back
   button that showed on the first question. Setting the property keeps the
   attribute and the accessibility tree in step for free.

   The only class this file ever touches is is-current, on one sidebar link. */
(function () {
  'use strict';

  /* GUARDED, AND THE GUARD IS THE FEATURE. If the markup ever moves and one of
     these is missing, the right outcome is that the script does nothing at all.
     An exception thrown here would leave the page looking perfectly normal but
     silently unfilterable, and the only clue would be a console message nobody
     is looking at. The page reads and navigates fine with no script, so doing
     nothing is a safe floor rather than a broken state.

     The status paragraph is guarded separately further down, because it is an
     announcement for screen readers rather than something the filter needs: if
     it is absent, filtering must still work. */
  var input = document.getElementById('search-input');
  var noResults = document.getElementById('no-results');
  var statusEl = document.getElementById('search-status');

  if (!input || !noResults) return;

  /* ---------------------------------------------------------------- the model */

  /* Built once, at startup. Each group is one section: its heading, its sidebar
     link, and its card elements, each carrying its prepared search string. The
     filter then does no DOM querying and no string work at all, which is what
     keeps a keystroke cheap. */
  var GROUPS = [];

  /* THE SEARCH STRING IS BUILT FROM THE CHILD NODES, NOT FROM textContent ON THE
     PARENT, AND THIS IS THE WHOLE REASON THIS FUNCTION EXISTS.

     Two cards carry a MOBILE badge, and the badge span sits inside the title
     span, which is how the page this content came from marked it up. So
     titleEl.textContent reads "How to Complete a Project DateMobile", with the
     badge welded onto the last word and no separator. A reader searching for
     "date" still matches, but one searching for "date mobile" does not, and
     worse, "datemobile" does.

     Reading the text nodes and the badge as separate nodes and joining them with
     a space is the fix at the source. Patching the string afterwards, by
     inserting a space before a known badge word, would work only for the badge
     words somebody thought of.

     Lowercased once, here, so the filter never lowercases 41 strings per
     keystroke. Whitespace is collapsed because the markup is indented and a
     title that ever wraps across lines would otherwise carry newlines into the
     comparison. */
  function searchTextFor(card) {
    var titleEl = card.querySelector('.card-title');
    if (!titleEl) return '';

    var parts = [];
    var kids = titleEl.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var node = kids[i];
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.nodeValue);
      } else if (node.nodeType === Node.ELEMENT_NODE &&
                 node.classList.contains('card-badge')) {
        parts.push(node.textContent);
      }
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  var headings = document.querySelectorAll('h2.section-head');

  for (var h = 0; h < headings.length; h++) {
    var heading = headings[h];
    var section = heading.closest('section');
    if (!section) continue;

    /* The sidebar link for this section is the one whose hash is this heading's
       id. That relationship is the only thing tying the nav to the content, so
       a link with no matching section simply has no group and is left alone. */
    var catLink = heading.id
      ? document.querySelector('.cat-item[href="#' + heading.id + '"]')
      : null;

    /* CACHED ON THE ELEMENT, as a plain property. Not a data- attribute: that
       would serialise the string into the DOM where no reader and no stylesheet
       has any use for it, and it would double the page weight of every title. */
    var cardEls = section.querySelectorAll('a.card');
    var cards = [];
    for (var c = 0; c < cardEls.length; c++) {
      cardEls[c].jdSearch = searchTextFor(cardEls[c]);
      cards.push(cardEls[c]);
    }

    var group = {
      index: h,
      heading: heading,
      section: section,
      catLink: catLink,
      cards: cards
    };

    /* Hung on the element so the observer can get from an entry.target straight
       back to its group without a lookup table. A plain property rather than a
       data- attribute: a data- attribute would serialise this into the DOM for
       no reader and no stylesheet to use. */
    heading.jdGroup = group;
    GROUPS.push(group);
  }

  /* --------------------------------------------------------------- the filter */

  /* The live region is only useful when it changes. A region rewritten with the
     same sentence on every keystroke produces a stream of identical
     announcements, which is worse than silence because it buries the one that
     mattered. So the count is tracked and the region is written only when the
     count actually moves.

     -1 rather than 0 as the starting value, because 0 is a real count that has
     to be announceable. Clearing resets to -1 so that typing the same query
     again announces again: the reader has been told nothing since the box
     emptied, so the next result is news. */
  var lastAnnounced = -1;

  function announce(count) {
    if (!statusEl || count === lastAnnounced) return;
    lastAnnounced = count;
    statusEl.textContent =
      count === 0 ? 'No guides match' :
      count === 1 ? '1 guide matches' :
      count + ' guides match';
  }

  function clearAnnouncement() {
    if (!statusEl) return;
    lastAnnounced = -1;
    statusEl.textContent = '';
  }

  /* Substring match, and nothing more. No fuzzy matching, no scoring, no
     debounce. Forty one cards is small enough that filtering on every keystroke
     is imperceptible, and a debounce would add lag to the one interaction on
     this page that has to feel instant. */
  function applyFilter() {
    var q = input.value.trim().toLowerCase();
    var g;
    var i;
    var j;

    if (!q) {
      for (i = 0; i < GROUPS.length; i++) {
        g = GROUPS[i];
        g.section.hidden = false;
        if (g.catLink) g.catLink.hidden = false;
        for (j = 0; j < g.cards.length; j++) g.cards[j].hidden = false;
      }
      noResults.hidden = true;
      clearAnnouncement();
      return;
    }

    var total = 0;

    for (i = 0; i < GROUPS.length; i++) {
      g = GROUPS[i];
      var shown = 0;

      for (j = 0; j < g.cards.length; j++) {
        var hit = g.cards[j].jdSearch.indexOf(q) !== -1;
        g.cards[j].hidden = !hit;
        if (hit) shown++;
      }

      /* A section with no surviving cards is hidden whole, heading included.
         Hiding the grid and leaving the h2 stranded over an empty gap is the
         obvious failure here, and it reads as a bug rather than as a filter. */
      g.section.hidden = shown === 0;

      /* THE CATEGORY LIST IS NOT FILTERED, BUT A LINK TO A HIDDEN SECTION IS.
         The categories are navigation, not results, so they are not matched
         against the query. What would be wrong is leaving a link that jumps to
         a section which is no longer on the page: the reader clicks it and
         nothing happens. So a link is hidden when and only when its section is,
         and every link comes back when the query empties. */
      if (g.catLink) g.catLink.hidden = shown === 0;

      total += shown;
    }

    noResults.hidden = total > 0;
    announce(total);
  }

  /* --------------------------------------------- sidebar highlight on scroll */

  /* IntersectionObserver rather than a scroll listener. A scroll handler fires
     far more often than this state can possibly change, so it would have to be
     throttled by hand, and a hand rolled throttle is a second thing to get
     wrong. The observer only calls back when a heading actually crosses the
     band, which is exactly when the answer changes.

     If the API is missing the highlight is skipped and search still works. A
     missing convenience must never take out the whole script. */
  var currentLink = null;

  /* Headings currently inside the band, in no particular order. The winner is
     chosen from this list rather than from the callback's entries, because a
     callback only reports headings that CHANGED state: on any given call the
     heading that should win may not be in entries at all. */
  var live = [];

  /* Document order stands in for vertical order, which is sound here because the
     sections are stacked blocks in a single column, so the earlier heading is
     always the higher one. Reading getBoundingClientRect on each candidate would
     measure the same thing at the cost of a layout. */
  function pickWinner() {
    var best = null;

    for (var i = 0; i < live.length; i++) {
      var g = live[i].jdGroup;

      /* A hidden section must never win. The observer does report a hidden
         heading as no longer intersecting, since a hidden element has no box, so
         this mostly settles itself; the check is here because callbacks are
         asynchronous and there can be a frame where a heading the filter just
         hid is still in the list. */
      if (!g || g.section.hidden) continue;
      if (best === null || g.index < best.index) best = g;
    }

    return best;
  }

  function setCurrent(group) {
    var link = group.catLink;
    if (!link || link === currentLink) return;
    if (currentLink) currentLink.classList.remove('is-current');
    link.classList.add('is-current');
    currentLink = link;
  }

  if (typeof IntersectionObserver === 'function' && GROUPS.length) {
    /* The band runs from 10 percent to 20 percent down the viewport: the top
       margin pulls the root box down by 10 percent and the bottom margin pulls
       it up by 80 percent. A heading becomes current a little before it reaches
       the very top of the screen, which is where a reader's attention already
       is, rather than at the instant it touches the edge, which highlights late
       and feels like it is lagging behind the scroll.

       All eight headings are observed once and the hidden ones are skipped when
       the winner is picked. Observing and unobserving as the filter runs would
       be more code for the same result, and it would drop the observer's record
       of what is currently on screen every time somebody typed. */
    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var target = entries[i].target;
        var at = live.indexOf(target);

        if (entries[i].isIntersecting) {
          if (at === -1) live.push(target);
        } else if (at !== -1) {
          live.splice(at, 1);
        }
      }

      var winner = pickWinner();

      /* Nothing in the band, which happens mid scroll between two long sections
         and while the page sits at the very bottom. Keep the last highlight
         rather than clearing it: an empty sidebar tells the reader less than a
         slightly stale one, and it flickers on every fast scroll. */
      if (winner) setCurrent(winner);
    }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });

    for (var k = 0; k < GROUPS.length; k++) observer.observe(GROUPS[k].heading);
  }

  /* NO CLICK HANDLER ON THE CATEGORY LINKS, DELIBERATELY. The anchor navigates
     on its own and the observer picks the new heading up as the smooth scroll
     lands. Setting is-current on click as well would mean two things writing the
     same class from different clocks, and the visible result is a flicker as the
     manual value is overwritten by the observer a moment later. */

  /* ---------------------------------------------------------------- start up */

  input.addEventListener('input', applyFilter);

  /* Run once now. Nothing is typed on a fresh load, so this normally just
     confirms the unfiltered state, but a browser restoring a form value on back
     navigation would otherwise leave the box holding a query while every card
     was still on screen. */
  applyFilter();
}());
