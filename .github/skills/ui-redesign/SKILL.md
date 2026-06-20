---
name: ui-redesign
description: "Redesign UI components and pages with professional UX/UI engineering quality. Use when: redesigning layouts, improving visual hierarchy, modernizing component styling, enhancing user experience, applying design best practices, polishing landing pages, improving responsive design, adding micro-interactions."
argument-hint: "Component or page name to redesign (e.g., Hero, Navbar, About page)"
---

# Professional UI Redesign

Redesign components and pages following senior UX/UI engineering standards, grounded in this project's design system.

## When to Use

- Redesigning or polishing any component or page
- Improving visual hierarchy, spacing, or typography
- Modernizing layouts with professional design patterns
- Enhancing responsive behavior or micro-interactions
- Applying accessibility and motion best practices

## Design System Reference

Before making changes, respect the established tokens:

| Token           | Value                                     | Usage                        |
| --------------- | ----------------------------------------- | ---------------------------- |
| Primary         | `hsl(var(--primary))` — Deep Navy #1A2F52 | Headers, nav, trust elements |
| CTA             | `hsl(var(--cta))` — Bright Blue #1E6FBF   | Primary buttons, key actions |
| Accent          | `hsl(var(--accent))` — Sky Blue #2A96C8   | Links, highlights, badges    |
| Surface         | `hsl(var(--surface))` — Off-white #F5F7FA | Section backgrounds          |
| Surface-alt     | `hsl(var(--surface-alt))` — #ECF0F5       | Alternating sections         |
| Font Display    | Inter 700, -0.03em tracking               | Headings, hero text          |
| Font Body       | Inter 400, -0.02em tracking               | Paragraphs, labels           |
| Card Radius     | `rounded-card` (8px)                      | Cards, modals, dialogs       |
| Section Spacing | `py-[60px] lg:py-[100px]`                 | Vertical section padding     |
| Container       | `container` utility, max 1280px           | Content wrapper              |

## Procedure

### 1. Audit the Target

- Read the component/page file completely
- Identify: layout structure, visual hierarchy, spacing, typography, color usage, responsiveness, animation
- Note specific weaknesses (cramped spacing, poor contrast, inconsistent sizing, missing hover states)

### 2. Apply Design Principles

Follow this checklist for every redesign:

- [ ] **Visual hierarchy**: Most important content is largest/boldest; clear reading flow (F-pattern or Z-pattern)
- [ ] **Whitespace**: Generous padding between sections; content breathes — avoid cramped layouts
- [ ] **Typography scale**: Clear distinction between h1 → h2 → h3 → body; use `font-display` for headings
- [ ] **Color contrast**: WCAG AA minimum (4.5:1 text, 3:1 large text); verify with semantic color tokens
- [ ] **Consistent spacing**: Use Tailwind scale (`gap-6`, `py-16`) instead of arbitrary values where possible
- [ ] **Responsive flow**: Mobile-first; stacks vertically on small screens, expands on `sm`/`lg`/`2xl`
- [ ] **Interactive states**: Hover, focus, active states on all clickable elements
- [ ] **Motion**: Framer Motion entrance animations (`initial` / `animate` / `whileInView`); respect `prefers-reduced-motion`
- [ ] **Icon consistency**: Lucide icons, sized uniformly (e.g., `h-5 w-5` for inline, `h-8 w-8` for feature icons)
- [ ] **CTA prominence**: Primary action uses `variant="cta"`, secondary uses outline variant

### 3. Implement Changes

- Use the project's existing patterns: `cn()` utility for conditional classes, CVA button variants, shadcn/ui primitives
- Animate with Framer Motion (staggered children, `viewport={{ once: true }}` for scroll triggers)
- Keep components self-contained; extract reusable sub-components only when repeated 3+ times
- Use semantic HTML (`section`, `article`, `nav`, `header`) for SEO and accessibility

### 4. Verify Quality

After implementation, confirm:

- [ ] No hardcoded colors — all via CSS variable tokens
- [ ] Responsive at 320px, 768px, 1024px, 1280px viewpoints
- [ ] Buttons and links have visible focus rings
- [ ] Animations are subtle (0.3–0.6s duration, ease-out curves)
- [ ] Text is readable (min 16px body, min 14px captions)
- [ ] No layout shifts on load (images have dimensions, fonts handled)
