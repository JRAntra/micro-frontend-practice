# Design notes

Write your answers under each heading. These questions have no single right answer —
a trainer reads what you write, so take a position and say what it costs. "It depends"
is only useful if you say what it depends _on_.

Aim for a short paragraph each. Delete the italic prompt lines as you go.

---

## 1. When is something a remote, and when is it just a library?

_You now have both in this workspace: `apps/products` is a remote, `libs/shared-auth` is a
library. Both are code shared between applications. What actually decides which one a
given piece of functionality should be? What does choosing "remote" buy you, and what
does it cost you that a library doesn't?_

## 2. Where do the deployment boundaries go?

_Module Federation lets teams deploy independently. Independently of what, exactly?
Describe who can ship without coordinating with whom in this workspace, and name one
change that would still require a coordinated release across both apps._

## 3. What is your version policy for shared dependencies?

_Angular must be a singleton, so host and remote have to agree on it at runtime — but
they build and deploy at different times. What is your policy when the shell is on
Angular 19 and the products team wants to move to 20? Who decides, what enforces it,
and what does the failure look like if nobody does?_

## 4. Two teams, two versions of `shared-auth`. What breaks?

_Suppose the products team ships a `shared-auth` that adds a field to the session, and
the shell is still running the previous version — or the reverse. Walk through what
actually happens at runtime given a singleton share, and say how you would keep this
from becoming an outage._

## 5. What is the blast radius of one remote being down?

_TOUR.md → "Blast radius" walks you through an experiment: make the remote's
`remoteEntry.mjs` return 404 and load the shell. Do it, describe what you actually
observe, and explain why it happens where it happens. Then say what you would change
in a system you owned — and what that change would cost._

## 6. When would you argue AGAINST microfrontends?

_You have now paid the setup cost first-hand. For what kind of team, product, or stage
would you tell someone this architecture is the wrong choice, and what would you
recommend instead?_
