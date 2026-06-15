## Description
<!-- Brief description of changes -->

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update
- [ ] Refactor / performance improvement

## Checklist

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Focus management is correct for modals/drawers/multi-step flows
- [ ] Screen reader testing performed (or not applicable)
- [ ] Color contrast meets WCAG AA (4.5:1 text, 3:1 large text/UI components)
- [ ] `aria-*` attributes are used correctly where needed
- [ ] Animations respect `prefers-reduced-motion`

### Security
- [ ] No sensitive data (tokens, PII) exposed in client logs or URLs
- [ ] API inputs are validated and sanitized
- [ ] Authentication/authorization checks are in place for protected routes
- [ ] No new uses of `dangerouslySetInnerHTML` without justification
- [ ] CORS and security headers reviewed (if backend changes involved)

### Performance
- [ ] No unnecessary re-renders introduced
- [ ] Images use `next/image` or are properly optimized
- [ ] Large dependencies are lazy-loaded or code-split
- [ ] Camera/media streams are properly cleaned up
- [ ] No memory leaks introduced (event listeners, intervals, etc.)

### Mobile Responsiveness
- [ ] Tested on mobile viewport (375px minimum width)
- [ ] Touch targets meet 44x44px minimum
- [ ] Camera UI works correctly on mobile devices
- [ ] No horizontal scroll on any viewport
- [ ] Safe area insets handled for notched devices

### Enrollment Quality (if applicable)
- [ ] Face detection thresholds unchanged or intentionally modified
- [ ] Capture quality validation still enforced
- [ ] Multi-angle capture flow tested end-to-end
- [ ] Upload validation and error recovery verified
- [ ] Session persistence across page refresh tested

### Type Safety
- [ ] No new `any` types introduced without justification
- [ ] API response types are properly validated at runtime
- [ ] Component props are fully typed
- [ ] `as` type assertions justified in comments

### Error Handling
- [ ] Network errors show user-actionable messages
- [ ] Loading states prevent duplicate submissions
- [ ] Error boundaries catch unexpected failures
- [ ] Destructive actions require confirmation

## Testing
- [ ] Backend tests pass (`cd apps/api && PYTHONPATH=. .venv/bin/pytest`)
- [ ] Frontend linting passes (`pnpm --filter web lint`)
- [ ] Manual testing performed on intended flows
- [ ] Edge cases considered (empty states, long text, slow network)

## Screenshots / Recordings
<!-- Attach visual evidence for UI changes, or write "N/A" -->

## Related Issues
<!-- Link related issues or write "N/A" -->
