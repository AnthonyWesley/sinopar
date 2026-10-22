---
project: Sinopar Ferramentas
direction: E-commerce
language: EN
---
────────────────────────────────────────────────────────
E-COMMERCE CONVERSION DESIGN DIRECTION
────────────────────────────────────────────────────────

Build Sinopar Ferramentas — E-commerce, Sinop, Mato Grosso Brasil — as a high-performance, high-conversion, trustworthy e-commerce experience.

────────────────────────────────────────────────────────
PROJECT BRIEF
────────────────────────────────────────────────────────

- Project: Sinopar Ferramentas
- Business: E-commerce
- What it does: Parafusos e Ferramentas em geral
- Where it operates: Sinop, Mato Grosso Brasil
- Who it serves: Construtoras, produtor rural, empresas e varejo
- Scope: a new website built from scratch

────────────────────────────────────────────────────────
PRIMARY OBJECTIVE
────────────────────────────────────────────────────────

The single job of this website is to complete online purchases.

Conversion priority, in order:

1. complete online purchases
2. Explore the brand and its proof

The primary action must be reachable from every screen without scrolling back to the header. No storytelling section may sit between the visitor and it.

Success is measured as: Pela quantidade de vendas.. Design decisions that trade against this metric must be flagged, not made silently.

────────────────────────────────────────────────────────
WHAT THE INTERFACE MUST COMMUNICATE
────────────────────────────────────────────────────────

The interface must prioritise:

- Product discovery
- Fast decision-making
- Clear pricing
- Search, filtering and comparison
- Basket and checkout completion
- Trust
- Mobile purchasing
- Repeat purchase

────────────────────────────────────────────────────────
SITE ARCHITECTURE
────────────────────────────────────────────────────────

Pages:

- Contato
- Home
- Reservas
- Preços
- Portfólio
- Serviços
- Produtos
- Localização

Build only these. Do not invent extra pages, and do not create a section that has no real content behind it — leave an explicit placeholder and say so instead.

────────────────────────────────────────────────────────
VISUAL LANGUAGE
────────────────────────────────────────────────────────

Use:

- Clear category navigation
- High-quality product photography
- Highly legible buttons
- Compact utility typography
- Strong merchandising zones
- Product-first layouts
- Strong price hierarchy
- Visible product states
- Clear grid systems

Avoid:

- Oversized editorial sections before products
- Hidden navigation
- Heavy animation
- Low-contrast pricing
- Excessive carousels
- Product cards with inconsistent dimensions
- Checkout distractions and forced account creation
- Fake urgency and dark patterns

────────────────────────────────────────────────────────
COLOUR SYSTEM
────────────────────────────────────────────────────────

Existing brand assets — these are the source of truth: Amarelo, Preto e  branco

Build a palette derived strictly from the existing brand assets.

Supporting tones that fit this direction:

- A neutral, high-contrast base so product photography carries the colour
- One decisive action colour reserved for add-to-basket and checkout
- A distinct discount colour that is never reused for anything else
- Clear semantic colours for in stock, low stock and out of stock

Every text and control combination must pass WCAG 2.2 AA. Check contrast before shipping a colour, not after.

────────────────────────────────────────────────────────
TYPOGRAPHY
────────────────────────────────────────────────────────

Use a heavy, wide sans-serif for display, paired with a highly legible grotesque for body text.

- A compact, highly legible sans-serif across the whole catalogue
- Tabular numerals for prices, quantities and totals
- Price larger and heavier than the product name
- Discounted prices always paired with the original, never alone
- Short product names truncated predictably at two lines

Set type responsively with clamp() or the stack equivalent. Body text no smaller than 16px. Never ship more than two families plus one monospace.

────────────────────────────────────────────────────────
LAYOUT SYSTEM
────────────────────────────────────────────────────────

- Product listing grids with stable card heights
- Filters as a sidebar on desktop and a drawer on mobile
- Breadcrumb navigation on every catalogue page
- A home page that reaches real merchandising within one screen
- A sticky mobile purchase bar
- A product detail page where price, variant and purchase sit above the fold

────────────────────────────────────────────────────────
MOTION SYSTEM
────────────────────────────────────────────────────────

Motion is subtle. It confirms actions and softens changes of state — it never performs.

Allowed:

- Add-to-basket confirmation
- Basket drawer transition
- Product image changes and variant state updates
- Filter transitions and search suggestions
- Wishlist confirmation
- Checkout progress and validation feedback

Timing:

- Product interactions: 100–180ms
- Drawers and modals: 180–280ms
- Page transitions: 200–350ms

Avoid:

- Any motion that delays product access or checkout
- Decorative scroll animation on listing pages
- Animated interstitials between catalogue steps

Under prefers-reduced-motion:

- Remove parallax, cursor effects, tilt and ambient background motion
- Replace slide and scroll-linked transitions with opacity or an immediate state change
- Stop marquees, tickers and looping animation
- Preserve every piece of content, every function and the final visual hierarchy
- The reduced-motion experience must feel intentionally designed, not broken

────────────────────────────────────────────────────────
MOBILE EXPERIENCE
────────────────────────────────────────────────────────

Traffic is split between phone and desktop. Both layouts are first-class; neither is a fallback of the other.

- Immediate visual impact within the first screen
- Thumb-friendly navigation and tap targets of at least 44px
- The primary CTA stays visible or reachable at all times
- Short text blocks and swipeable collections instead of deep scrolling
- Minimal form friction — the fewest fields the business can accept
- Images sized for mobile bandwidth, not cropped desktop assets

────────────────────────────────────────────────────────
NAVIGATION AND SEARCH
────────────────────────────────────────────────────────

- Search result count, filters and sort controls
- Recent searches and suggested categories
- Predictive search with product thumbnails and typo tolerance
- Category mega-menu and breadcrumb navigation
- Mobile filter drawer with clear active-filter states and reset
- Useful empty-search guidance

────────────────────────────────────────────────────────
PRODUCT DETAIL PAGE — ABOVE THE FOLD ORDER
────────────────────────────────────────────────────────

- 1. Product name
- 6. Primary purchase action
- 8. Returns summary
- 4. Variant selection
- 5. Stock or availability
- Add to Basket must stay clear and available after a valid variant selection
- 7. Delivery information
- 2. Product imagery

────────────────────────────────────────────────────────
BASKET AND CHECKOUT
────────────────────────────────────────────────────────

- The basket shows product, variant, quantity, unit price and total
- Accessible validation and easy recovery from errors
- Do not hide additional costs until late in checkout
- Do not insert unrelated promotional content into checkout
- Guest checkout, address clarity and payment clarity
- Real delivery estimates and promotion state

────────────────────────────────────────────────────────
TRUST SYSTEM
────────────────────────────────────────────────────────

- Verified reviews and real product guarantees
- Secure payment methods, delivery information and returns policy
- Contact information and customer support
- Company information and physical location
- Do not add fictional badges, fake countdowns or misleading low-stock messages

────────────────────────────────────────────────────────
NEVER INVENT
────────────────────────────────────────────────────────

- Prices, stock, discounts or delivery estimates
- Reviews, product specifications or guarantees
- Returns conditions or product availability
- Preserve the existing catalogue, variants, SKUs, tax logic, shipping rules and payment contracts

────────────────────────────────────────────────────────
E-COMMERCE PERFORMANCE
────────────────────────────────────────────────────────

- Server-rendered catalogue pages when the stack supports it
- Deferred reviews and recommendation widgets
- Fast product image loading with responsive image sizes
- Correct lazy loading and stable product-card heights
- Low JavaScript overhead and fast search
- Watch add-to-basket latency, search response, layout shifts and checkout interaction delay

────────────────────────────────────────────────────────
SEO AND PERFORMANCE
────────────────────────────────────────────────────────

Search:

- local SEO: city and neighbourhood terms, LocalBusiness structured data, embedded map, NAP consistency
- brand SEO: Organization structured data, consistent metadata and clean social preview cards
- product SEO: Product and Offer structured data, unique product copy, canonical handling for variants
- content SEO: article structured data, a clear heading hierarchy and internal linking between pillar and supporting pages

Performance and accessibility targets:

- minimal client JavaScript — no framework-heavy solution where static HTML and CSS suffice
- LCP under 2.5s on a mid-range mobile device over 4G
- CLS under 0.1 — reserve space for every image, embed and ad slot
- modern image formats, responsive srcset and correct lazy loading below the fold
- graceful behaviour on low-end devices and slow connections, with static fallbacks for every animation
- WCAG 2.2 AA: contrast, focus order, keyboard operation, visible focus states and honest alt text

Semantic HTML, a logical heading order and a keyboard-operable interface are not optional in any of these directions.

────────────────────────────────────────────────────────
INTEGRATIONS AND CONTRACTS
────────────────────────────────────────────────────────

The site integrates with:

- Instagram feed
- WhatsApp
- Sistema de reserva
- Google Maps
- Asaas

Treat every item above as an existing contract. Do not change routes, payloads, event names, environment variables or checkout behaviour to suit the design. If the design genuinely requires a contract change, stop and say so before making it.

────────────────────────────────────────────────────────
REFERENCES AND EXCLUSIONS
────────────────────────────────────────────────────────

References to draw from:

https://parafusosolto.com/?srsltid=AU7gw4UNQHTWliCQnJvsZeBF51jb2Qvgi7WxvIsvTeHVk2AvApikvyNM 
https://torkstoree.com.br/?srsltid=AU7gw4XD7PuLwQpYppe1fv3b3_blDWwBFo-eqzVohzkZnKeuWz2k5lLU
Não tenho.

Take the underlying principle from each reference, not its surface. Do not clone a layout.

────────────────────────────────────────────────────────
CREATIVE MOOD
────────────────────────────────────────────────────────

The result should feel like:

- A shop that respects the shopper’s time
- A catalogue that is fast to scan and easy to trust
- A checkout that never surprises
- A store that earns the second purchase

────────────────────────────────────────────────────────
STYLE APPLICATION RULE
────────────────────────────────────────────────────────

Apply this creative direction adaptively. Do not force every technique described above into the project.

Select only the techniques that:

- Match the brand
- Support the business goal stated above
- Improve the user experience rather than decorate it
- Preserve accessibility and performance
- Work within the existing technology stack
- Do not break routes, integrations, content, SEO, forms, checkout, booking, CMS or analytics

This document defines the visual and interaction treatment and the architecture to build. Content accuracy is the business owner’s to confirm — flag anything you had to assume.

────────────────────────────────────────────────────────
BEFORE YOU FINISH
────────────────────────────────────────────────────────

- List every assumption you made about content, prices, hours or availability
- Confirm the primary action is reachable within one interaction from every page
- Check the layout at 375px, 768px and 1440px
- Check keyboard navigation and visible focus on every interactive element
- Check the page with prefers-reduced-motion enabled
- Name anything in this brief you deliberately did not do, and why
