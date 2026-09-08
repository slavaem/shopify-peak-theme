# Peak Framework

A modular and highly customizable Shopify theme framework built with a focus on clean architecture, reusable components, centralized logic, and a powerful Theme Customizer.

Peak Framework started as an experiment based on Shopify's free educational theme and evolved into a reusable theme architecture designed to make building and customizing Shopify stores easier for both developers and merchants.

---

## What is Peak Framework?

The project was built around a simple idea:

> **Build the theme once, keep the architecture clean, and let the merchant shape the store without needing to edit code.**

During development, the theme evolved from a traditional Shopify theme into a modular framework with:

- **Reusable and isolated sections:** Modular components designed for independent reuse.
- **Centralized JavaScript logic:** Unified state management without heavy external libraries.
- **Data-attribute driven interactions:** Clean, declarative link between Liquid markup and JS (`data-action`).
- **Design tokens and semantic CSS variables:** Global, centralized design system for quick re-skinning.
- **Container Query based responsive components:** Modern CSS layouts that adapt to container boundaries rather than just viewports.
- **Extensive Theme Customizer settings:** Granular control over layout, typography, colors, and media.
- **Reusable snippets and components:** Single sources of truth for cards, images, headings, and buttons.
- **Shopify-native APIs for cart and product data:** Modern AJAX integrations for seamless UI updates.
- **Minimal hardcoded values:** Everything driven by theme settings and translation keys.
- **Clear separation of concerns:** Strict decoupling of structure, presentation, and behavior.

---

## Architecture

Peak Framework is organized around several core principles:

### 1. Modular Sections

Each section is designed to be as independent as possible, with its own markup, styling, settings, and behavior. Sections can be added, removed, rearranged, and configured directly through the Shopify Theme Editor.

### 2. Centralized Logic

Instead of duplicating JavaScript logic across individual sections and snippets, common functionality is handled by a central application layer.

The framework includes centralized stores and controllers for:

- Cart state (`CartStore`)
- Wishlist state (`WishlistStore`)
- Cart operations (`Cart` controller)
- Dynamic notifications & Toasts
- Quantity controls
- Mobile navigation
- Dynamic UI updates

This keeps individual components lightweight and eliminates duplicated logic.

### 3. Data-Driven Interactions

Interactive elements communicate with the JavaScript layer through semantic `data-*` attributes.

```html
<button type="button" data-action="cart-add" data-variant-id="{{ variant.id }}">
  Add to Cart
</button>
The JavaScript layer detects the action via event delegation and routes it to
the appropriate handler. This creates a predictable connection between Liquid
markup and JS without requiring inline event handlers or scattered listeners. 4.
Design Tokens The visual system is built on reusable design tokens instead of
scattered hardcoded CSS values. Tokens cover: Typography: Font families, scales,
weights, and line-heights. Spacing: Layout padding, section gaps, and inline
margins. Border Radius: Global corner rounding tokens. Colors: Surface,
background, border, accent, and text semantics. Shadows & Elevation: Subtle card
and overlay shadows. Transitions: Standardized animation durations and curves.
Components consume semantic tokens rather than defining their own independent
visual system. 5. Responsive Components Responsive behavior is not based
exclusively on viewport breakpoints. Where appropriate, components use CSS
Container Queries so that their layout and typography respond dynamically to the
specific space available within their parent container. 6. Theme Customizer A
major goal of Peak Framework is to empower merchants without requiring coding
knowledge. The Customizer provides control over: Typography selection and
heading scale Spacing, padding, and page max-widths Color modes (Theme default
vs. Custom per section) Background images, video backgrounds, and color overlays
Product card appearance, image aspect ratio, and hover behaviors Shadows,
borders, and button styles The merchant can shape a store that feels completely
unique without editing a single line of Liquid, CSS, or JS. Core Components
Reusable Product Cards The product card is built as a standalone reusable
snippet (snippets/product-card.liquid). It supports: Product and variant pricing
with sale detection (compare_at_price) Sold-out state handling and custom badges
Responsive images routed through a universal image.liquid snippet Direct
Wishlist (wishlist-toggle) and Cart (cart-add) integrations Theme-controlled
vendor visibility, image ratios, and spacing JavaScript Architecture Peak
Framework uses a lightweight, zero-dependency JavaScript architecture: Cart
Store: A Pub/Sub store maintaining cart state, notifying subscribers on updates.
Wishlist Store: Manages wishlist items using localStorage with real-time UI
synchronization. Actions Registry: Centralized event delegator handling click,
input, and submit events based on data-action. Cart Controller: Executes Shopify
AJAX Cart API operations (/cart/add.js, /cart/change.js, /cart/clear.js).
Project Evolution Shopify Theme Foundation: Started from Shopify's free
educational theme as a foundation for learning and experimentation. Modular
Sections: Gradually rebuilt sections with isolated styling and logic for maximum
reusability. Centralized Logic: Consolidated state management and AJAX handlers
into a single lightweight JS controller. Data-Driven Events: Standardized all UI
interactions around data-* attributes. Advanced Theme Customization: Expanded
schema settings to grant complete visual control in the Theme Editor. Design
System Consolidation: Refactored CSS around design tokens, semantic CSS
variables, and container queries. The result is Peak Framework. Demos & Showcase
The framework is built to support multiple visual identities on top of the same
core code: Peak Minimal: A clean, marketplace-oriented implementation. Peak
Showcase (Snowboard Shop): An expressive, high-contrast e-commerce showcase
featuring video hero, masonry grids, and dynamic quick views. Status Peak
Framework is in its final polish stage. The architecture is fully established
and production-ready. Current focus: [x] Schema & Customizer verification [x]
Responsive & Container Query testing [x] Design token consistency across all
sections [x] Code cleanup & removal of redundant snippets [x] Final
documentation & GitHub release
```
