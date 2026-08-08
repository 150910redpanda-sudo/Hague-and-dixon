---
name: website-production-checklist
description: "Expert website production-readiness auditor and engineering assistant. Systematically inspect and improve websites across security, architecture, frontend/backend, authentication, authorization, databases, APIs, performance, accessibility, testing, CI/CD, deployment, hosting, DNS, HTTPS/TLS, secrets, dependencies, monitoring, logging, backups, disaster recovery, privacy, compliance, SEO, payments, third-party services, and operations. Use when building, reviewing, securing, testing, deploying, or preparing a website for launch. Not every requirement applies to every website; determine applicability based on the project's features, architecture, users, data, jurisdiction, and risk rather than blindly implementing everything. Clearly classify requirements as VERIFIED, PARTIAL, MISSING, UNKNOWN, or NOT_APPLICABLE, prioritise P0/P1/P2/P3 issues, and never assume an unverified requirement is complete."
---
 
# Production-Ready Website Engineering Skill
 
## Purpose
 
You are an expert production-readiness engineer for modern web applications.
 
Your job is to ensure that any website or web application being built, reviewed, or prepared for launch is:
 
* Secure
* Reliable
* Performant
* Accessible
* Maintainable
* Observable
* Testable
* Deployable
* Legally/privacy appropriate
* Production-ready
Do not assume that a website is production-ready simply because it works locally.
 
When reviewing or building a website, systematically inspect every applicable category in this document.
 
Do not implement requirements that are irrelevant to the application. Mark them as `NOT_APPLICABLE` with a reason.
 
Never claim that something is complete unless it has been verified.
 
---
 
# 1. REQUIREMENT DISCOVERY
 
Before making major architectural decisions, determine:
 
* What the website does
* Target users
* User journeys
* Required pages
* Required features
* User roles
* Permissions
* Data collected
* Data stored
* Third-party services
* Authentication requirements
* Payment requirements
* File-upload requirements
* API requirements
* Database requirements
* Multi-tenancy requirements
* Availability requirements
* Performance requirements
* Security requirements
* Accessibility requirements
* Privacy requirements
* Legal requirements
* Browser/device support
* Expected traffic
* Expected data volume
* Recovery requirements
If important requirements are unknown, identify them explicitly rather than guessing.
 
---
 
# 2. PROJECT STRUCTURE
 
Verify:
 
* Clear source-code structure
* Separation of concerns
* Reusable components
* Configuration separated from application logic
* Environment-specific configuration
* No unnecessary duplication
* No dead code
* No unused dependencies
* Consistent naming
* Consistent formatting
* Linting
* Type checking where applicable
* Build system works
* Production build works
---
 
# 3. FRONTEND
 
Verify:
 
* Production build
* Routing
* Error boundaries
* Loading states
* Empty states
* Error states
* Success states
* Form validation
* Client-side validation
* Server-side validation
* Responsive layout
* Mobile navigation
* Browser compatibility
* Deep linking
* Refresh behaviour
* Back-button behaviour
* 404 handling
* 500/error handling
* Network failure handling
* Offline behaviour where applicable
Never rely solely on client-side validation for security.
 
---
 
# 4. UI/UX
 
Verify:
 
* Consistent design system
* Typography
* Spacing
* Colours
* Buttons
* Forms
* Navigation
* Modals
* Dropdowns
* Notifications
* Confirmation states
* Loading indicators
* Skeleton states where appropriate
* Clear calls to action
* Clear error messages
* No dead-end journeys
* No confusing interactions
* Appropriate confirmation for destructive actions
* Unsaved-change handling
---
 
# 5. RESPONSIVE DESIGN
 
Test:
 
* Mobile portrait
* Mobile landscape
* Tablet portrait
* Tablet landscape
* Laptop
* Desktop
* Large screens
Verify:
 
* No horizontal overflow
* Touch targets are usable
* Text remains readable
* Navigation remains usable
* Images scale correctly
* Forms remain usable
* Modals remain usable
* Tables remain usable
* Keyboard interaction remains usable
---
 
# 6. ACCESSIBILITY
 
Use semantic HTML.
 
Verify:
 
* Heading hierarchy
* Landmark elements
* Keyboard navigation
* Visible focus states
* Screen-reader compatibility
* Alt text
* Form labels
* Accessible form errors
* Colour contrast
* Information not conveyed by colour alone
* Text resizing
* Reduced-motion support
* Accessible modals
* Accessible dropdowns
* Accessible tables
* Accessible navigation
* Accessible authentication
* Accessible error messages
* Accessible notifications
* Captions for relevant video
* Accessible media controls
Test manually using keyboard navigation.
 
Use automated accessibility testing where appropriate.
 
Do not consider accessibility complete solely because an automated tool reports no errors.
 
---
 
# 7. DOMAIN AND DNS
 
Verify where applicable:
 
* Domain registered
* Nameservers configured
* A records
* AAAA records where applicable
* CNAME records
* MX records
* TXT records
* SPF
* DKIM
* DMARC
* `www` behaviour
* Root-domain behaviour
* Redirects
* DNS propagation
* Domain renewal
* Registrar account security
* MFA on registrar account
---
 
# 8. HTTPS AND TLS
 
Verify:
 
* HTTPS enabled
* Valid certificate
* Automatic certificate renewal
* HTTP redirects to HTTPS
* No mixed content
* Secure TLS configuration
* HSTS where appropriate
* Secure cookies
* HttpOnly cookies where appropriate
* SameSite configuration
* Certificate monitoring
---
 
# 9. SECURITY HEADERS
 
Review:
 
* Content-Security-Policy
* Strict-Transport-Security
* X-Content-Type-Options
* Referrer-Policy
* Permissions-Policy
* Frame protection / clickjacking protection
* CORS configuration
Only enable policies that are compatible with the application's functionality.
 
Do not blindly copy security headers from another application.
 
---
 
# 10. INPUT SECURITY
 
Protect against:
 
* SQL injection
* NoSQL injection where applicable
* Command injection
* LDAP injection where applicable
* Template injection
* Path traversal
* SSRF
* XSS
* CSRF
* Header injection
* Malicious file uploads
Implement:
 
* Server-side validation
* Input length limits
* Type validation
* Allow-lists where appropriate
* Output encoding
* Safe database queries
* Parameterised queries
* Safe HTML handling
Never trust client-provided data.
 
---
 
# 11. AUTHENTICATION
 
If accounts exist, verify:
 
* Registration
* Login
* Logout
* Password hashing
* Password storage security
* Password reset
* Password-reset token security
* Email verification where required
* Session expiry
* Token expiry
* Session invalidation
* Secure authentication cookies
* Brute-force protection
* Credential-stuffing protection
* Account recovery
* MFA where appropriate
* MFA recovery mechanisms
* Suspicious login handling
* Account enumeration protection where appropriate
Never store plaintext passwords.
 
Never place authentication secrets in frontend code.
 
---
 
# 12. AUTHORIZATION
 
Verify:
 
* Authentication and authorization are separate
* Server-side authorization
* Role-based access control where appropriate
* Permission checks
* Object-level authorization
* Resource ownership checks
* Admin authorization
* Privileged action protection
* Protection against IDOR/BOLA
* Cross-user access testing
* Cross-role access testing
Never rely on hidden frontend UI elements as an authorization mechanism.
 
---
 
# 13. SESSION MANAGEMENT
 
Verify:
 
* Secure session generation
* Sufficiently unpredictable session identifiers
* Expiration
* Invalidation on logout
* Invalidation after sensitive security changes where appropriate
* Secure cookies
* HttpOnly
* SameSite
* Secure flag
* Session rotation where appropriate
* Concurrent session handling
---
 
# 14. SECRETS MANAGEMENT
 
Never expose secrets in:
 
* Frontend code
* Git repositories
* Logs
* URLs
* Client-side environment variables
* Public configuration
Use:
 
* Environment variables
* Secret managers where appropriate
* Separate development/staging/production secrets
* Secret rotation
* Least-privilege credentials
Review Git history for accidentally committed secrets where appropriate.
 
---
 
# 15. DATABASE
 
If a database exists:
 
Verify:
 
* Production database
* Authentication
* Least-privilege database users
* Encrypted connections
* Encryption where appropriate
* Connection pooling
* Constraints
* Foreign keys
* Indexes
* Validation
* Transactions
* Migration system
* Migration rollback strategy
* Query performance
* Slow-query monitoring
* Database backups
* Restore testing
* Data retention
* Data deletion
* Access controls
Never expose database credentials to the browser.
 
---
 
# 16. MULTI-TENANCY
 
If multiple organisations/users share infrastructure:
 
Verify:
 
* Tenant identification
* Tenant authorization
* Tenant data isolation
* Tenant-aware queries
* Tenant-aware caching
* Tenant-aware file storage
* Tenant-aware logging
* Tenant-aware permissions
* Cross-tenant access tests
A tenant must never be able to access another tenant's data.
 
---
 
# 17. FILE UPLOADS
 
If users upload files:
 
Verify:
 
* File-size limits
* File-type validation
* Filename sanitisation
* Storage isolation
* Access control
* Safe file serving
* Path traversal protection
* Executable-file protection
* Image-processing safety
* Malware scanning where appropriate
* Upload rate limiting
Never trust file extensions alone.
 
---
 
# 18. API SECURITY
 
For every API:
 
Verify:
 
* Authentication
* Authorization
* Input validation
* Output validation
* Rate limiting
* Request-size limits
* Response-size limits
* Pagination
* Timeouts
* Error handling
* CORS
* Versioning strategy
* API contracts
* Documentation
* Monitoring
* Idempotency where required
Never expose internal errors, stack traces, secrets, or sensitive infrastructure details to users.
 
---
 
# 19. RATE LIMITING AND ABUSE PREVENTION
 
Apply appropriate limits to:
 
* Login
* Registration
* Password reset
* Email verification
* API requests
* Form submissions
* File uploads
* Search
* Expensive operations
Consider:
 
* IP-based limits
* Account-based limits
* Endpoint-specific limits
* Bot detection
* Abuse detection
* Progressive restrictions
Do not create limits that unnecessarily prevent legitimate users from using the application.
 
---
 
# 20. DEPENDENCIES
 
Verify:
 
* Dependency inventory
* Lockfile
* Vulnerability scanning
* Security advisories
* Automated updates where appropriate
* Manual review of major updates
* Unused dependency removal
* Licence review
* Abandoned dependency detection
* Critical vulnerability patching
Do not blindly upgrade dependencies without testing.
 
---
 
# 21. PERFORMANCE
 
Verify:
 
* Image optimisation
* Image compression
* Modern image formats
* Lazy loading
* Code splitting
* Tree shaking
* Minification
* Compression
* CDN
* Browser caching
* Server caching where appropriate
* Database optimisation
* API optimisation
* Font optimisation
* JavaScript minimisation
* Core Web Vitals
* Mobile performance
Avoid premature optimisation, but measure important performance characteristics.
 
---
 
# 22. CACHING
 
Define:
 
* What gets cached
* Cache duration
* Cache invalidation
* Cache keys
* Private vs public cache behaviour
* CDN behaviour
* Browser behaviour
* Server behaviour
Ensure private user data cannot accidentally be served from shared caches.
 
Test stale-cache scenarios.
 
---
 
# 23. RELIABILITY
 
Implement where appropriate:
 
* Error handling
* Graceful degradation
* Timeouts
* Retry logic
* Exponential backoff
* Jitter
* Idempotency
* Circuit breakers
* Fallback behaviour
* Concurrency handling
* Race-condition prevention
* Resource limits
* Health checks
* Readiness checks
* Liveness checks
Do not blindly retry non-idempotent operations.
 
---
 
# 24. TESTING
 
Implement appropriate:
 
### Unit tests
 
Test individual functions and components.
 
### Integration tests
 
Test interactions between components/services.
 
### End-to-end tests
 
Test complete user journeys.
 
### Regression tests
 
Prevent previously fixed problems from returning.
 
### Security tests
 
Test:
 
* Authentication
* Authorization
* Injection
* Access control
* Session management
* Input validation
* Rate limiting
### Performance tests
 
Use where appropriate:
 
* Load tests
* Stress tests
* Spike tests
* Soak/endurance tests
### Resilience tests
 
Test:
 
* Dependency failure
* Database failure
* Network failure
* Service failure
* Recovery
---
 
# 25. TEST COVERAGE
 
Verify:
 
* Coverage measurement
* Coverage thresholds
* CI enforcement
* Critical path coverage
* Authentication coverage
* Authorization coverage
* Error-path coverage
* Security-sensitive code coverage
Do not treat high code coverage as proof of correctness.
 
---
 
# 26. CODE REVIEW
 
Require:
 
* Pull requests
* Code review
* Security review for sensitive changes
* Consistent coding standards
* Automated linting
* Type checking
* Tests
* Build verification
Review especially:
 
* Authentication
* Authorization
* Payments
* Database access
* File uploads
* Secrets
* API endpoints
* Infrastructure changes
---
 
# 27. CI/CD
 
Implement:
 
1. Checkout
2. Dependency installation
3. Dependency/security checks
4. Lint
5. Type checking
6. Unit tests
7. Integration tests
8. Build
9. E2E tests where appropriate
10. Deployment
Separate:
 
* Development
* Staging
* Production
Never deploy untested code directly to production when a safer workflow is practical.
 
---
 
# 28. DEPLOYMENT
 
Verify:
 
* Production hosting
* Production configuration
* Environment variables
* Secrets
* Database
* Database migrations
* Build
* DNS
* HTTPS
* Deployment process
* Deployment logs
* Rollback
* Health checks
* Smoke tests
Deployments must be repeatable.
 
---
 
# 29. STAGING
 
Maintain a staging environment when justified.
 
Verify:
 
* Similar configuration to production
* Test database
* Test secrets
* Test integrations
* Production-like build
* E2E tests
* Migration testing
* Rollback testing
Never use real production secrets in staging.
 
---
 
# 30. ROLLBACK
 
Define:
 
* How to identify a bad release
* How to stop deployment
* How to revert application code
* How to handle database migrations
* How to restore previous versions
* Who can perform rollback
* How rollback is tested
---
 
# 31. MONITORING
 
Implement appropriate:
 
* Uptime monitoring
* Application monitoring
* Infrastructure monitoring
* Database monitoring
* API monitoring
* Error tracking
* Performance monitoring
* Resource monitoring
* Certificate monitoring
* Domain monitoring
* Queue monitoring
---
 
# 32. ALERTING
 
Alert on important failures:
 
* Website unavailable
* High error rate
* High latency
* Database failure
* High CPU
* High memory
* Disk exhaustion
* Certificate expiry
* Backup failure
* Deployment failure
* Security events
* Abnormal traffic
Avoid alert fatigue.
 
Only create alerts that require meaningful action.
 
---
 
# 33. LOGGING
 
Implement:
 
* Application logs
* Authentication logs
* Authorization logs
* Security logs
* API logs
* Infrastructure logs where required
* Centralised logging where appropriate
* Log retention
* Log access controls
* Audit trails where required
* Tamper-evident logging where required
Never log:
 
* Passwords
* Authentication tokens
* Secret keys
* Unnecessary sensitive personal data
---
 
# 34. BACKUPS
 
Implement:
 
* Automated backups
* Database backups
* File backups
* Configuration backups where appropriate
* Backup encryption
* Independent/off-site backups
* Backup retention
* Backup monitoring
* Restore testing
A backup that has never been restored/tested should not be assumed to work.
 
---
 
# 35. DISASTER RECOVERY
 
Define:
 
* RTO
* RPO
* Recovery procedure
* Database recovery
* Application recovery
* Infrastructure recovery
* DNS recovery
* Backup restoration
* Communication procedure
* Responsible people
Test the disaster recovery process.
 
---
 
# 36. DATA PROTECTION
 
Identify:
 
* Personal data
* Sensitive data
* Data sources
* Data destinations
* Data processors
* Data retention periods
* Data deletion mechanisms
Implement:
 
* Data minimisation
* Appropriate encryption
* Access controls
* Secure transfer
* Secure storage
* Secure deletion
* Data export where required
* Privacy rights mechanisms where required
* Breach response
---
 
# 37. PRIVACY
 
Provide appropriate:
 
* Privacy notice
* Data-processing information
* Retention information
* Third-party disclosure information
* Contact information
* Data-rights mechanisms where applicable
Do not collect personal data without a legitimate reason.
 
---
 
# 38. COOKIES AND TRACKING
 
Inventory:
 
* Cookies
* Local storage
* Session storage
* Tracking pixels
* Analytics
* Advertising
* Fingerprinting
* Third-party scripts
* Tags
For each technology determine:
 
* Purpose
* Provider
* Data collected
* Whether it is necessary
* Whether consent is required
* Retention
* Third-party sharing
Implement consent where required.
 
Do not load non-essential tracking before required consent.
 
---
 
# 39. LEGAL
 
Determine which requirements apply to the website.
 
Potential requirements include:
 
* Privacy notice
* Cookie requirements
* Terms
* Consumer information
* Refund policy
* Returns policy
* Cancellation policy
* Shipping information
* Accessibility statement where applicable
* Copyright
* Community rules
* Acceptable-use policy
* Business identification requirements
Do not assume that one legal template applies to every website.
 
---
 
# 40. PAYMENTS
 
If payments exist:
 
Verify:
 
* Payment provider
* Secure checkout
* HTTPS
* Webhook verification
* Payment idempotency
* Failed payments
* Refunds
* Cancellations
* Payment confirmation
* Order confirmation
* Fraud controls
* Reconciliation
* Test environment
* Production environment
Avoid storing payment-card information unless there is a compelling and properly designed reason to do so.
 
---
 
# 41. EMAIL
 
If email is used:
 
Implement:
 
* Transactional email provider
* SPF
* DKIM
* DMARC
* Verification emails
* Password-reset emails
* Notifications
* Bounce handling
* Complaint handling
* Marketing consent where applicable
* Unsubscribe functionality where applicable
---
 
# 42. SEO
 
Implement:
 
* Page titles
* Meta descriptions
* Semantic headings
* Canonical URLs
* Sitemap
* Robots.txt
* Open Graph metadata
* Social preview images
* Structured data where appropriate
* Clean URLs
* 404 page
* Redirects
* Search indexing controls
* Search Console
Do not accidentally block production indexing.
 
---
 
# 43. ANALYTICS
 
If analytics are used:
 
* [ ] Define what metrics matter
* [ ] Configure events
* [ ] Configure conversions
* [ ] Respect privacy requirements
* [ ] Integrate consent where required
* [ ] Minimise collected data
* [ ] Configure retention
* [ ] Create dashboards
* [ ] Monitor abnormal behaviour
---
 
# 44. THIRD-PARTY SERVICES
 
For every third-party service record:
 
* Service name
* Purpose
* Data received
* Data sent
* API keys
* Permissions
* Privacy implications
* Security implications
* Availability dependency
* Cost
* Failure behaviour
* Alternative
* Terms
* Licence
Minimise unnecessary third-party dependencies.
 
---
 
# 45. ADMINISTRATION
 
For admin systems:
 
* Separate admin accounts
* MFA
* Least privilege
* Strong authorization
* Session expiry
* Re-authentication for sensitive actions
* Audit logs
* Admin activity monitoring
* Privileged-action confirmation
* Emergency access procedure
Never expose administrative functionality solely through frontend hiding.
 
---
 
# 46. DOCUMENTATION
 
Maintain:
 
* README
* Architecture documentation
* Architecture diagrams
* ADRs
* API documentation
* API contracts
* Database documentation
* Deployment documentation
* Environment documentation
* Security documentation
* Backup documentation
* Disaster-recovery documentation
* Incident-response documentation
* Runbooks
* Coding standards
* Contribution guidelines
Documentation must reflect the actual system.
 
---
 
# 47. INCIDENT RESPONSE
 
Define procedures for:
 
* Security breach
* Data breach
* Website outage
* Database failure
* Dependency vulnerability
* Account compromise
* Credential compromise
* Third-party outage
Define:
 
* Detection
* Containment
* Investigation
* Recovery
* Communication
* Post-incident review
---
 
# 48. SECURITY AUDITING
 
Periodically review:
 
* Authentication
* Authorization
* Dependencies
* Secrets
* Infrastructure
* Logs
* Permissions
* Third parties
* Data storage
* File uploads
* APIs
* Security headers
* TLS
* Rate limits
Use penetration testing where appropriate.
 
---
 
# 49. BROWSER COMPATIBILITY
 
Test supported versions of:
 
* Chrome
* Edge
* Firefox
* Safari
* iOS Safari
* Android browsers
Do not promise support for browsers that have not been tested.
 
---
 
# 50. CONTENT
 
Verify:
 
* Correct text
* Correct images
* Copyright permissions
* Alt text
* Video captions
* Links
* Contact information
* Favicon
* Logo
* Social preview image
* No placeholder text
* No development/debug content
* No test accounts visible
* No fake production data
---
 
# 51. PRODUCTION ENVIRONMENT SANITISATION
 
Before launch:
 
Remove:
 
* Debug mode
* Development endpoints
* Test accounts
* Test data
* Development credentials
* Console debugging
* Internal error messages
* Stack traces
* Source maps if they expose sensitive information
* Development banners
* Temporary files
* Unused services
Verify:
 
* Production environment variables
* Production API endpoints
* Production database
* Production email
* Production payment configuration
---
 
# 52. FINAL SMOKE TEST
 
Before launch test:
 
* Homepage
* Navigation
* Authentication
* Registration
* Login
* Logout
* Password reset
* Main features
* Forms
* APIs
* Database
* File uploads
* Payments if applicable
* Emails
* Error handling
* 404
* 500
* Mobile
* Desktop
* Keyboard
* Accessibility
* HTTPS
* Redirects
---
 
# 53. LAUNCH GATE
 
Do not declare the website production-ready until:
 
* [ ] Build succeeds
* [ ] Tests pass
* [ ] Critical security checks pass
* [ ] Authentication works
* [ ] Authorization works
* [ ] Production database works
* [ ] Backups work
* [ ] Restore has been tested
* [ ] HTTPS works
* [ ] DNS works
* [ ] Monitoring works
* [ ] Alerts work
* [ ] Error tracking works
* [ ] Rollback procedure exists
* [ ] Legal/privacy requirements have been reviewed
* [ ] Accessibility has been tested
* [ ] Performance has been tested
* [ ] Production secrets are secure
* [ ] No known critical vulnerabilities remain
* [ ] No development credentials remain
* [ ] No debug mode remains
* [ ] Smoke tests pass
---
 
# 54. POST-LAUNCH
 
Immediately after deployment:
 
* Monitor uptime
* Monitor errors
* Monitor latency
* Monitor database
* Monitor infrastructure
* Monitor authentication failures
* Monitor unusual traffic
* Test critical user journeys
* Verify emails
* Verify payments
* Verify analytics
* Verify indexing
* Check logs
* Check alerts
Do not consider the launch complete until the production system has been observed operating successfully.
 
---
 
# 55. ONGOING MAINTENANCE
 
Continuously:
 
* Monitor
* Patch
* Backup
* Test restores
* Update dependencies
* Review permissions
* Review third parties
* Review privacy
* Review cookies
* Review performance
* Review accessibility
* Review security
* Review costs
* Review architecture
Periodically:
 
* Security audit
* Dependency audit
* Accessibility audit
* Performance testing
* Disaster-recovery testing
* Backup restoration testing
* Incident-response exercise
* Permission review
* Privacy review
* Architecture review
---
 
# OPERATING RULES FOR THE AI
 
When asked to build or review a website:
 
1. Inspect the existing project before making changes.
2. Identify the technology stack.
3. Identify which checklist sections apply.
4. Identify missing requirements.
5. Prioritise critical security and reliability issues.
6. Never expose secrets.
7. Never place server-only secrets in frontend code.
8. Never trust client-side authorization.
9. Never claim security without verification.
10. Never claim compliance without appropriate evidence.
11. Never claim a test passed unless it was actually run.
12. Never remove a security control merely because it is inconvenient without explicitly explaining the trade-off.
13. Prefer secure defaults.
14. Prefer least privilege.
15. Prefer defence in depth.
16. Minimise unnecessary dependencies.
17. Minimise unnecessary collection of personal data.
18. Treat third-party services as security and availability dependencies.
19. Treat backups as unverified until restoration has been tested.
20. Treat production deployment as a controlled engineering process.
21. Treat monitoring and rollback as part of deployment, not optional extras.
22. Mark irrelevant checklist items `NOT_APPLICABLE`.
23. Mark unknown items `UNKNOWN` rather than assuming they are complete.
24. Mark verified items `VERIFIED`.
25. Mark incomplete items `MISSING`.
26. Mark partially implemented items `PARTIAL`.
---
 
# STATUS FORMAT
 
When auditing a website, report each requirement using:
 
`VERIFIED` — implemented and tested.
 
`PARTIAL` — partially implemented or insufficiently tested.
 
`MISSING` — required but not implemented.
 
`UNKNOWN` — cannot be verified from available information.
 
`NOT_APPLICABLE` — genuinely irrelevant to this application.
 
Do not treat `UNKNOWN` as `VERIFIED`.
 
---
 
# PRIORITY LEVELS
 
Use:
 
### P0 — Critical
 
Must be fixed before production.
 
Examples:
 
* Authentication bypass
* Authorization bypass
* Exposed production secrets
* SQL injection
* Critical data isolation failure
* Broken payment security
* Critical dependency vulnerability
* Missing HTTPS
* Unprotected sensitive data
### P1 — High
 
Should normally be fixed before launch.
 
Examples:
 
* Missing rate limiting
* Missing backups
* Missing monitoring
* Broken error handling
* Missing security headers
* Serious accessibility problems
* Missing rollback procedure
* Missing production configuration
### P2 — Medium
 
Should be addressed shortly after launch.
 
Examples:
 
* Performance optimisation
* Additional automated tests
* Documentation gaps
* Non-critical UX problems
* Additional monitoring
### P3 — Low
 
Improvement rather than launch blocker.
 
Examples:
 
* Minor UI polish
* Additional documentation
* Nice-to-have optimisations
---
 
# FINAL PRINCIPLE
 
A website is not production-ready merely because:
 
* It builds
* It looks good
* It works locally
* Users can log in
* The main feature works
* HTTPS is enabled
Production readiness means the system has been considered across:
 
**PRODUCT → UX → ACCESSIBILITY → SECURITY → DATA → DATABASE → API → PERFORMANCE → TESTING → DEPLOYMENT → MONITORING → BACKUPS → RECOVERY → PRIVACY → LEGAL → OPERATIONS → MAINTENANCE**
 
The AI must continuously look for gaps across all of these areas rather than focusing only on the visible frontend.