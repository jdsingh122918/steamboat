# Steamboat Documentation

## Directory Structure

```
docs/
├── requirements/          # Business & product requirements
│   ├── REQUIREMENTS.md    # Core platform features
│   └── MULTI-TENANT-REQUIREMENTS.md  # Multi-tenant evolution
│
├── design/                # Technical design & architecture
│   ├── DESIGN.md          # UI/UX design system
│   ├── AGENT-INTEGRATION.md    # Claude Agent SDK integration
│   └── RUST-WASM-INTEGRATION.md # Rust/WASM architecture
│
└── plans/                 # Implementation plans
    └── rust-infrastructure-implementation.md  # Rust infrastructure stories
```

## Quick Links

### Requirements
- [Core Requirements](requirements/REQUIREMENTS.md) - Feature specifications for expense tracking, gallery, itinerary
- [Multi-Tenant Requirements](requirements/MULTI-TENANT-REQUIREMENTS.md) - Platform evolution to multi-tenant SaaS

### Design
- [UI/UX Design](design/DESIGN.md) - Visual design system, component library, interaction patterns
- [Agent Integration](design/AGENT-INTEGRATION.md) - Claude Agent SDK integration for 6 AI agents
- [Rust/WASM Integration](design/RUST-WASM-INTEGRATION.md) - Performance optimization with Rust

### Implementation Plans
- [Rust Infrastructure](plans/rust-infrastructure-implementation.md) - 20 test-driven stories for Rust/WASM implementation
