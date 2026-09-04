# SettleAI Design System

## The Vibe
SettleAI is a production-grade reconciliation agent built for high-stakes finance operations. It rejects the generic "AI slop" aesthetic (gradients, glowing borders, blurry orbs, thick random side-borders). Instead, it embraces a **strict, utilitarian, neo-brutalist** design language.

## Core Rules

1. **Deterministic Typography:** 
   - Use `mono` fonts for anything related to data, IDs, hashes, or technical details. 
   - Use uppercase, heavily tracked tracking (`tracking-wider`, `tracking-widest`) for labels, badges, and headers.
   - Use `font-black` and `font-bold` liberally to establish strong hierarchy.

2. **High-Contrast Borders & Shadows:**
   - Elements should have crisp, solid borders (e.g., `border-2 border-black` or `border-4 border-black`).
   - Shadows must be hard, non-blurred dropshadows to reinforce the brutalist feel (e.g., `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`).
   - Remove all `border-radius` where possible (`rounded-none`).

3. **Color Palette:**
   - Backgrounds should be stark white or a rigid grid pattern (e.g., `#000 1px` graph paper).
   - Accents are sharp and vivid (e.g., neon green `#4ade80`, loud yellow, stark red `#ef4444`) but used purposefully (e.g., for confidence scores or "high severity" alerts).
   - Core surfaces are `bg-white` and `bg-black`.

4. **Zero "AI Slop":**
   - NO floating blurred backgrounds (`blur-[100px]`).
   - NO arbitrary thick side tabs (e.g., `border-l-4 border-accent`) used as generic decoration. Use top-borders (`border-t-2`) or structural containers instead.
   - NO gentle rounded corners (`rounded-xl` or `rounded-2xl`).
   - Micro-interactions (hover states, animations) should feel crisp and instantaneous (e.g., a solid translation `-translate-y-1` rather than a soft float).

5. **Functional UI First:**
   - Every piece of data needs a clear label.
   - Use tabular layouts and grid structures to present complex financial data.
