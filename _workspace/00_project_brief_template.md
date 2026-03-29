# Project Brief Template

## 1. Project Snapshot
- Project name:
- One-line summary:
- Delivery type:
  - Marketing site / SaaS app / Admin dashboard / Ecommerce / Community / Hybrid
- Deadline or milestone:
- Primary contact / decision owner:

## 2. Business Goal
- Why this project exists:
- Primary success metric:
- Secondary success metrics:
- What must be true at launch:

## 3. Target Users
- Primary audience:
- Secondary audience:
- Key user problems:
- Devices to optimize first:
  - Desktop / Mobile web / Tablet / Mixed

## 4. Scope
### Pages
- Required pages:
- Optional pages:
- Pages that can wait until phase 2:

### Features
- Must-have features:
- Nice-to-have features:
- Out of scope:

### Content
- Existing content source:
- Missing content:
- Need CMS or static content only:

## 5. Brand and Design Direction
- Tone:
- Visual references:
- Colors or brand assets:
- What the UI should feel like:
- What to avoid:

## 6. Frontend Direction
- Preferred frontend stack:
  - Next.js / React / App Router / Pages Router / Tailwind / CSS Modules / Other
- SEO requirements:
- Accessibility requirements:
- Internationalization needed:

## 7. Backend / API Direction
- Backend type:
  - Next.js API routes / Separate API server / BaaS / Mixed
- Authentication needed:
- Data storage needed:
- Third-party integrations:
- Admin or internal tools required:

## 8. Deployment and Operations
- Hosting target:
  - Vercel / Cloudflare / Netlify / Render / Other
- Environment variables expected:
- Analytics / monitoring:
- Domain or staging requirements:

## 9. QA and Release Criteria
- Core user flows that must pass:
- Error states that must be tested:
- Browser/device coverage:
- Release blocker examples:

## 10. Notes for the Lead Agent
- Missing decisions:
- Technical risks:
- Dependencies on external teams:
- Suggested first worker fan-out:
  - wireframe-designer
  - nextjs-frontend-builder
  - api-backend-builder
  - qa-release-worker

## Kickoff Prompt Template
```markdown
이 프로젝트 브리프를 기준으로 웹사이트 하네스를 가동해줘.
우선 `_workspace/01_lead_delivery_plan.md`와 `_workspace/02_interface_contracts.md`를 채우고,
그 다음 디자인 워커와 구현 워커를 순서대로 조율해줘.
```

