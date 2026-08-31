Generate minimalist, solid UI SVG icons and export them as raw SVG, Angular components, or Flutter widgets. Use when the user asks to create, design, or export SVG icons, UI icons for web/mobile, Angular icon components, or Flutter icon assets.

Instructions
SVG Icon Generator
Generate clean, minimalist, solid vector icons optimized for UI elements (buttons, navigation, status indicators) with support for standard SVG, Angular components, and Flutter integrations.

When to Use
Creating new solid, minimalist UI icons for web or mobile interfaces.
Generating pure SVG markup with currentColor for dynamic styling.
Creating reusable Angular standalone icon components.
Generating Flutter vector code or flutter_svg compatible snippets.
Converting icon concepts or UI feature requirements into scalable vector assets.
Design Standards
Style: Minimalist, solid fill (fill="currentColor"). Use clean geometric shapes, balanced padding, and optical alignment.
Grid and ViewBox: Use a standard viewBox="0 0 24 24" with default width/height of 24 unless a different size is requested.
Accessibility: Include appropriate aria-hidden="true" for decorative icons or role="img" with title/desc when standalone.
Code Cleanliness: Omit unnecessary metadata, editor tags, or redundant grouping elements (<g>).
Implementation Workflows
1. Raw SVG Format
Generate clean, semantic SVG markup:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
  <path d="..." />
</svg>
2. Angular Standalone Component
Generate modern Angular standalone components with inline templates:

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon-[name]',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.viewBox]="viewBox"
      [attr.width]="size"
      [attr.height]="size"
      fill="currentColor"
      aria-hidden="true"
      [class]="customClass"
    >
      <path d="..." />
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon[Name]Component {
  @Input() size: number | string = 24;
  @Input() viewBox: string = '0 0 24 24';
  @Input() customClass: string = '';
}
3. Flutter Integration
Provide Flutter implementations either via flutter_svg or custom vector rendering:

Using flutter_svg:
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

class [Name]Icon extends StatelessWidget {
  final double size;
  final Color? color;

  const [Name]Icon({
    super.key,
    this.size = 24.0,
    this.color,
  });

  static const String _rawSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="..." />
</svg>''';

  @override
  Widget build(BuildContext context) {
    final iconColor = color ?? IconTheme.of(context).color ?? Colors.black;
    return SvgPicture.string(
      _rawSvg,
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(iconColor, BlendMode.srcIn),
    );
  }
}
Gotchas
Ensure all paths use closed shapes for solid fills (Z or z at the end of subpaths).
Avoid hardcoded fill colors (like #000000 or #FFFFFF); always default to currentColor so the icon adapts to themes and CSS classes.
Keep the coordinate system normalized within the 24x24 viewBox to maintain consistency across the entire icon set.