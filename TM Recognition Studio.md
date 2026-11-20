# Antigravity Build Specification

## Project: TM Recognition Studio

**Version:** 0.1.0  
**Development approach:** Plan → Review → Implement → Validate  
**Deployment:** Dockerized Progressive Web Application

---

## 1\. Project Mission

Build a self-contained, local-first Progressive Web Application (PWA) that transforms manually entered Team Member recognition information into professionally composed presentation slides.

The application produces exactly two slides:

1. BJ's Team Member Nominees — six nominees arranged in a fixed 3 × 2 grid.  
2. BJ's Team Member of the Month — one selected nominee presented with additional recognition information.

The application is a recognition compositor, NOT a recognition management system, presentation editor, or content management platform.

Its responsibility is to accept data, apply a selected template, render the slides, provide a preview, and export the finished product.

## 2\. Technical Architecture

Use the following stack:

- React  
- TypeScript  
- Vite  
- Tailwind CSS  
- Browser-native Canvas or equivalent deterministic rendering technology  
- PWA manifest and service worker  
- Docker  
- Nginx Alpine

Prefer client-side processing wherever practical.

Do not introduce a backend, database, external API, authentication service, or cloud dependency.

### Deployment requirements

The application must:

- Run entirely inside a Docker container.  
- Operate on a local network.  
- Work offline after initial installation.  
- Run without privileged container access.  
- Use a non-root process.  
- Support a read-only root filesystem.  
- Avoid unnecessary Linux capabilities.  
- Use temporary storage only where required.  
- Have a Docker health check.  
- Support resource limits.  
- Pin dependency and container versions.

The application must not require internet access during normal operation.

## 3\. Application Lifecycle

Implement the following workflow:

1. Input  
2. Compose  
3. Preview  
4. Export  
5. Reset

The application must not retain recognition data between sessions.

### Persistence rules

| Resource | Behavior |
| :---- | :---- |
| Application | Persistent |
| Template packages | Persistent |
| Application shell cache | Persistent |
| Recognition form data | Session memory only |
| Uploaded photos | Temporary |
| Generated slides | Temporary |
| Exported files | User downloads |
| Recognition history | Not supported |
| Database | Not required |

Do not use localStorage, IndexedDB, cookies, or service-worker caching to persist recognition content.

The service worker may cache application assets and approved template assets only.

Refreshing or closing the application must not restore previously entered recognition information.

## 4\. Recognition Input

### Nominee data

Accept exactly six nominees.

Each nominee contains:

- Team Member name (required)  
- Team Member photo (optional)

Support common image formats including JPG, JPEG, PNG, and WebP.

Allow photo replacement and removal.

Provide a generic placeholder when no photo is supplied.

### Winner selection

The winner must be selected from the six submitted nominees.

Do not require the user to re-enter the winner's name or upload the same photo again.

### Winner information

Additional fields:

- Store / Department  
- Recognition category  
- Recognition summary

Store / Department and recognition category are required.

Recognition summary is required.

Enforce reasonable character limits and display remaining character counts.

## 5\. Template Rendering Engine

This is a foundational architectural requirement.

Recognition data and presentation templates must remain completely independent.

The rendering engine must consume a normalized recognition data object and a selected template definition.

It must produce the same output for identical input and template versions.

### Template architecture

Use independently versioned template packages.

Suggested structure:

templates/

- bjs-spotlight/  
  - manifest.json  
  - nominees-background.png  
  - winner-background.png  
  - fonts/  
- additional-template/  
  - manifest.json  
  - nominees-background.png  
  - winner-background.png  
  - fonts/

Each template manifest must define:

- Template ID  
- Template name  
- Version  
- Canvas dimensions  
- Slide definitions  
- Background assets  
- Image bounding boxes  
- Text bounding boxes  
- Font specifications  
- Alignment  
- Image fitting rules  
- Text fitting rules

Use normalized coordinates where practical.

Template packages must be read-only during application operation.

Support loading templates from a designated read-only directory so new designs can be introduced without changing the recognition data model or rendering engine.

For V0.1, include one active template.

Do not build a visual template editor.

## 6\. Visual Fidelity Requirements

The supplied BJ's Team Member Spotlight design is the authoritative visual reference.

Do not redesign, modernize, reinterpret, or creatively modify it.

All static design elements must remain part of the template.

Only designated dynamic content regions may change.

### Slide 1: Nominees

- Six photo regions.  
- Six corresponding name regions.  
- Fixed 3 × 2 grid.  
- All six cards maintain equal dimensions.  
- Preserve all surrounding branding and decorative elements.

### Slide 2: Winner

- Winner photo.  
- Winner name.  
- Store / Department.  
- Recognition category.  
- Recognition summary.

The winner's photo and name must inherit directly from the selected nominee.

### Content fitting

Photos must:

- Preserve aspect ratio.  
- Use cover-style cropping.  
- Never stretch or distort.  
- Remain inside their assigned regions.

Text must:

- Remain inside designated regions.  
- Wrap appropriately.  
- Reduce font size within configured limits when necessary.  
- Never move surrounding template elements.

The renderer must never alter the underlying template dimensions or composition.

## 7\. Preview Interface

Provide a simple, professional administrative interface.

Required screens:

**Recognition Builder**

- Template selection.  
- Recognition period (optional metadata).  
- Six nominee input cards.  
- Photo uploads.  
- Winner selection.  
- Recognition detail fields.

**Preview**

- Nominee slide preview.  
- Winner slide preview.  
- Slide switching.  
- Validation messages.  
- Return to editing.

**Export**

- Individual slide downloads.  
- Combined PDF download.  
- Clear indication of export resolution.

The preview must accurately represent the final exported composition.

## 8\. Export Requirements

Primary output:

PNG, 1920 × 1080, 16:9.

Secondary output:

PDF containing both slides, one slide per page.

Do not implement PPTX in V0.1.

Ensure fonts and images are fully loaded before export.

Exported images must not contain application UI, borders, preview controls, or browser elements.

Use consistent rendering dimensions regardless of the browser window size.

## 9\. Reset Behavior

Provide a clearly identifiable Reset / New Recognition action.

Before clearing submitted information, request confirmation.

Upon confirmation:

- Clear all form fields.  
- Remove uploaded images from application memory.  
- Release generated object URLs.  
- Clear generated render buffers.  
- Reset validation state.  
- Return to the recognition builder.

Do not delete or modify templates.

Do not leave recognition information in persistent browser storage.

## 10\. Explicitly Excluded Features

Do not implement:

- Recognition history.  
- Previous submission retrieval.  
- User accounts.  
- Authentication.  
- Database.  
- Cloud storage.  
- SharePoint integration.  
- Power Automate integration.  
- AI-generated summaries.  
- Automated employee lookup.  
- External photo retrieval.  
- Analytics.  
- Multi-user collaboration.  
- Template editing interface.  
- Automated approval workflows.  
- PPTX generation.

Do not introduce additional features without approval.

## 11\. Development Standards

Follow these principles:

- Keep components modular.  
- Separate form state from rendering logic.  
- Keep templates independent from application components.  
- Validate inputs before rendering.  
- Handle malformed images gracefully.  
- Clean up temporary browser resources.  
- Use strict TypeScript.  
- Avoid unnecessary dependencies.  
- Document the template manifest specification.  
- Include Docker deployment instructions.  
- Include a README.  
- Include a basic test suite for validation, rendering geometry, and reset behavior.

Do not hardcode BJ's template coordinates throughout React components.

The template manifest must own those coordinates.

## 12\. Acceptance Criteria

V0.1 is complete when:

1. The application starts successfully through Docker Compose.  
2. The PWA works offline after initial installation.  
3. A user can enter six nominees.  
4. A user can upload or omit individual photos.  
5. A user can select one of the six nominees as the winner.  
6. Winner information automatically inherits the selected nominee's name and photo.  
7. Both slides render using the selected template.  
8. Text and images remain within their assigned regions.  
9. The user can preview both completed slides.  
10. The user can export two independent 1920 × 1080 PNG files.  
11. The user can export a combined two-page PDF.  
12. Reset clears all recognition content.  
13. No recognition data survives application termination or refresh.  
14. The container runs without privileged access.  
15. Template packages remain independent of recognition data and can be replaced without changing the rendering engine.

---

## 13\. Initial Development Instructions

**IMPORTANT: DO NOT BEGIN IMPLEMENTATION IMMEDIATELY.**

First, inspect the existing development environment and available project files.

Then produce an implementation plan covering:

1. Proposed project directory structure.  
2. Application architecture.  
3. Recognition data schema.  
4. Template manifest schema.  
5. Rendering strategy.  
6. Photo processing strategy.  
7. Export implementation.  
8. PWA caching strategy.  
9. Docker configuration and security.  
10. Testing strategy.  
11. Identified dependencies and risks.  
12. Any missing assets or information required before implementation.

Identify how the supplied template artwork will be incorporated. Do not invent missing template assets or silently substitute generated designs.

Present the plan for review and wait for explicit approval before writing implementation code.

The objective is a clean, maintainable V0.1 implementation, not a demonstration or disposable prototype.

**Project philosophy: Build it right, keep it simple, and make it extensible.**  
