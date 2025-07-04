# Styling Guide for Mini-Dispatch Dashboard

## Overview

This project uses a hybrid approach combining **Tailwind CSS v4** with **CSS Modules** and **custom utility classes** to create a maintainable, consistent, and scalable styling system.

## Architecture

### 1. **Tailwind CSS v4 (Primary)**
- **Purpose**: Utility-first CSS framework for rapid development
- **Version**: 4.1.10 with @tailwindcss/postcss
- **Usage**: Standard layout, spacing, colors, and common styling patterns
- **Compatibility**: Zero `@apply` directives (Tailwind v4 compatible)

### 2. **CSS Modules (Complex Components)**
- **Purpose**: Scoped styles for components with complex, unique styling
- **Usage**: Components like `ViewPayStatementPage.tsx` with 80+ style declarations
- **Benefits**: Prevents style conflicts, component-specific styling

### 3. **Custom Utility Classes (Reusable Patterns)**
- **Purpose**: Standardized patterns used across multiple components
- **Location**: `src/app/globals.css`
- **Benefits**: Consistency, maintainability, single source of truth

## File Structure

```
src/
├── app/
│   ├── globals.css              # Global styles, utility classes, CSS variables
│   └── ...
├── components/
│   ├── Button/
│   │   ├── Button.tsx           # Uses custom utility classes
│   │   └── Button.module.css    # CSS Module (legacy, being phased out)
│   └── DocumentUploadModal/
│       └── DocumentUploadModal.tsx  # Uses utility classes + minimal inline
├── features/
│   └── paystatements/
│       ├── ViewPayStatementPage.tsx     # Uses CSS Modules
│       └── ViewPayStatementPage.module.css  # Complex component styles
```

## Styling Conventions

### 1. **When to Use Each Approach**

#### Use **Tailwind CSS** for:
- ✅ Standard layouts and spacing
- ✅ Common UI patterns (flex, grid, padding, margins)
- ✅ Typography and colors
- ✅ Responsive design
- ✅ Hover and focus states

#### Use **Custom Utility Classes** for:
- ✅ Repeated patterns across components
- ✅ Standardized component styles (buttons, cards, forms)
- ✅ Design system elements
- ✅ Complex combinations used multiple times

#### Use **CSS Modules** for:
- ✅ Complex components with unique layouts
- ✅ Components with 20+ style declarations
- ✅ Highly specific styling that won't be reused
- ✅ Components with complex state-dependent styles

#### Use **Inline Styles** for:
- ✅ Dynamic values (progress bars, animations)
- ✅ Calculated styles based on props/state
- ⚠️ **Avoid for static styling**

### 2. **Naming Conventions**

#### CSS Custom Properties (Variables)
```css
/* Color System */
--color-primary: #2563eb;
--color-primary-hover: #1d4ed8;
--color-text: #111827;
--color-text-muted: #4b5563;

/* Spacing System */
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 0.75rem;
--spacing-lg: 1rem;

/* Component Sizing */
--container-sm: 28rem;
--container-md: 42rem;
--radius-md: 0.5rem;
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

#### Utility Class Names
```css
/* Pattern: component-variant-modifier */
.btn-primary           /* Button component, primary variant */
.btn-danger           /* Button component, danger variant */
.card-hover           /* Card component, hover modifier */
.status-success       /* Status component, success variant */
.page-container-lg    /* Page container, large size */
```

#### CSS Module Classes
```css
/* Pattern: descriptive-purpose */
.payStatementContainer
.driverInfoGrid
.tripsTableHeader
.paySummarySection
```

## Design System

### 1. **Color Palette**

#### Primary Colors
- **Primary**: `#2563eb` (Blue) - Main actions, links
- **Success**: `#16a34a` (Green) - Success states, confirmations
- **Warning**: `#ca8a04` (Yellow) - Warnings, pending states
- **Danger**: `#dc2626` (Red) - Errors, destructive actions

#### Text Colors
- **Primary Text**: `#111827` (Dark Gray)
- **Muted Text**: `#4b5563` (Medium Gray)
- **Light Text**: `#374151` (Light Gray)

#### Background Colors
- **Card Background**: `#ffffff` (White)
- **Section Background**: `#f9fafb` (Light Gray)
- **Header Background**: `#f3f4f6` (Gray)

### 2. **Typography Scale**

```css
.heading-xl    /* 1.875rem, 700 weight */
.heading-lg    /* 1.5rem, 700 weight */
.heading-md    /* 1.25rem, 600 weight */
.heading-sm    /* 1.125rem, 600 weight */
.text-muted    /* Muted color */
.text-error    /* Error color */
.text-success  /* Success color */
```

### 3. **Spacing System**

Based on 0.25rem (4px) increments:
- `xs`: 0.25rem (4px)
- `sm`: 0.5rem (8px)
- `md`: 0.75rem (12px)
- `lg`: 1rem (16px)
- `xl`: 1.5rem (24px)
- `2xl`: 2rem (32px)

### 4. **Component Library**

#### Buttons
```css
.btn-primary    /* Primary actions */
.btn-secondary  /* Secondary actions */
.btn-success    /* Success actions */
.btn-danger     /* Destructive actions */
.btn-warning    /* Warning actions */
```

#### Cards
```css
.card          /* Basic card */
.card-hover    /* Interactive card with hover effects */
```

#### Forms
```css
.input-field       /* Standard input */
.input-field-error /* Error state input */
.label-text        /* Form labels */
.form-section      /* Form sections */
```

#### Status Indicators
```css
.status-success    /* Green success badge */
.status-warning    /* Yellow warning badge */
.status-error      /* Red error badge */
.status-info       /* Blue info badge */
```

#### Alerts
```css
.alert-success     /* Success messages */
.alert-warning     /* Warning messages */
.alert-error       /* Error messages */
.alert-info        /* Info messages */
```

#### Page Containers
```css
.page-container-sm   /* Small pages (28rem max-width) */
.page-container-md   /* Medium pages (42rem max-width) */
.page-container-lg   /* Large pages (56rem max-width) */
.page-container-xl   /* Extra large pages (72rem max-width) */
```

#### Tables
```css
.table-container   /* Table wrapper */
.table-header      /* Table header styling */
.table-cell        /* Table cell styling */
.table-row-hover   /* Hover effects for rows */
```

#### Modals
```css
.modal-overlay     /* Modal backdrop */
.modal-content     /* Standard modal (28rem max-width) */
.modal-content-lg  /* Large modal (42rem max-width) */
```

#### Progress Bars
```css
.progress-container    /* Progress bar container */
.progress-bar         /* Progress bar fill */
.progress-bar-success /* Success color variant */
.progress-bar-warning /* Warning color variant */
.progress-bar-danger  /* Danger color variant */
```

## Best Practices

### 1. **CSS Organization**

#### Global CSS Structure (`globals.css`)
```css
/* 1. CSS Custom Properties */
:root { /* color, spacing, sizing variables */ }

/* 2. Base Styles */
body { /* global body styles */ }

/* 3. Layout Utilities */
.page-container-* { /* page containers */ }

/* 4. Component Utilities */
.card { /* card components */ }
.btn-* { /* button components */ }

/* 5. Specialized Components */
.progress-* { /* progress bars */ }
.modal-* { /* modals */ }

/* 6. Third-party Overrides */
.auth-container { /* Supabase auth styling */ }
```

#### CSS Module Structure
```css
/* Component-specific styles only */
.componentContainer { /* main container */ }
.componentHeader { /* header section */ }
.componentContent { /* content area */ }
.componentFooter { /* footer section */ }
```

### 2. **Performance Considerations**

#### Tailwind CSS Optimization
- **Purging**: Unused classes automatically removed in production
- **Custom Properties**: Consistent values across utility classes
- **No @apply**: Full Tailwind v4 compatibility

#### CSS Modules Optimization
- **Scoped**: Prevents global namespace pollution
- **Tree-shaking**: Unused styles eliminated
- **Minimal**: Only complex components use CSS modules

### 3. **Responsive Design**

#### Breakpoints (Tailwind defaults)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

#### Mobile-First Approach
```jsx
// Always start with mobile styles, then scale up
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Mobile: full width, Tablet: half width, Desktop: third width */}
</div>
```

### 4. **Accessibility**

#### Focus States
All interactive elements have focus states:
```css
.btn-primary:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
```

#### Color Contrast
All text meets WCAG AA standards:
- Primary text: `#111827` on `#ffffff` (15.8:1 ratio)
- Muted text: `#4b5563` on `#ffffff` (7.2:1 ratio)

#### Semantic HTML
Use semantic HTML with appropriate ARIA labels:
```jsx
<button
  className="btn-primary"
  aria-label="Close modal"
  onClick={onClose}
>
  ×
</button>
```

## Migration Guide

### From Inline Styles to Utility Classes

#### Before (Inline Styles)
```jsx
<div style={{
  maxWidth: '42rem',
  margin: '2rem auto',
  padding: '1.5rem',
  backgroundColor: '#ffffff',
  borderRadius: '0.5rem',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
}}>
```

#### After (Utility Classes)
```jsx
<div className="page-container-md">
```

### From Tailwind Classes to CSS Modules

#### Before (Repeated Tailwind)
```jsx
<div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
  <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200">
```

#### After (CSS Module)
```jsx
<div className={styles.complexComponent}>
  <div className={styles.complexComponent}>
    <div className={styles.complexComponent}>
```

```css
/* ViewPayStatementPage.module.css */
.complexComponent {
  background-color: var(--color-bg-card);
  padding: var(--spacing-xl);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
  transition: box-shadow var(--transition-normal);
}

.complexComponent:hover {
  box-shadow: var(--shadow-xl);
}
```

## Development Workflow

### 1. **Adding New Styles**

#### Step 1: Determine Approach
- **Reusable pattern** → Add to `globals.css` utility classes
- **Component-specific** → Use CSS Modules
- **Simple styling** → Use Tailwind classes
- **Dynamic values** → Use inline styles

#### Step 2: Follow Naming Conventions
- Utility classes: `component-variant-modifier`
- CSS modules: `descriptiveComponentName`
- Variables: `--category-property`

#### Step 3: Test Responsiveness
- Test on mobile, tablet, and desktop
- Use browser dev tools to verify breakpoints
- Ensure accessibility standards are met

### 2. **Refactoring Existing Styles**

#### Step 1: Audit Current Styles
```bash
# Find inline styles
grep -r "style={" src/

# Find repeated patterns
grep -r "className.*bg-white.*p-" src/
```

#### Step 2: Extract Patterns
- Identify repeated combinations
- Create utility classes for common patterns
- Move complex styles to CSS modules

#### Step 3: Update Components
- Replace inline styles with utility classes
- Update repeated patterns with single classes
- Test for visual regressions

## Troubleshooting

### Common Issues

#### 1. **Tailwind Classes Not Working**
```bash
# Check if classes are being purged
npm run build
grep -n "your-class" .next/static/css/*.css
```

#### 2. **CSS Module Classes Not Applying**
```jsx
// Ensure proper import
import styles from './Component.module.css';

// Use correct syntax
<div className={styles.className}>
```

#### 3. **Custom Properties Not Working**
```css
/* Ensure variables are defined in :root */
:root {
  --your-variable: value;
}

/* Use var() function */
.your-class {
  color: var(--your-variable);
}
```

#### 4. **Build Errors with @apply**
```css
/* DON'T use @apply (Tailwind v4 incompatible) */
.btn {
  @apply px-4 py-2 bg-blue-500;
}

/* DO use regular CSS with custom properties */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
}
```

## Future Considerations

### 1. **Design System Evolution**
- Consider migrating to CSS-in-JS for dynamic theming
- Evaluate component library frameworks (Radix, Headless UI)
- Implement design tokens for better design-development sync

### 2. **Performance Optimization**
- Monitor CSS bundle size
- Consider critical CSS extraction
- Implement CSS loading strategies

### 3. **Accessibility Improvements**
- Add high contrast mode support
- Implement reduced motion preferences
- Enhance keyboard navigation

## Conclusion

This styling system provides:
- **Consistency** through utility classes and design tokens
- **Maintainability** through organized CSS and clear conventions
- **Scalability** through modular approach and component-based architecture
- **Performance** through optimized Tailwind CSS and scoped styles
- **Developer Experience** through clear guidelines and best practices

The hybrid approach balances the rapid development benefits of Tailwind CSS with the maintainability needs of a growing application, ensuring the codebase remains clean and scalable as the project evolves. 