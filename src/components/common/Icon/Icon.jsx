import React from 'react';
import { Icon as BaseIcon } from '../../icons';

/**
 * Kit-level icon wrapper. Maps symbolic sizes sm/md/lg to 16/20/24 px,
 * so call-sites don't hardcode pixel numbers. Also accepts `size={number}`
 * to pass straight through to the underlying SVG.
 *
 * @param {{
 *   name: string,
 *   size?: 'sm'|'md'|'lg'|number,
 *   className?: string,
 * } & React.SVGAttributes<SVGSVGElement>} props
 */
export function Icon({ name, size = 'md', ...rest }) {
  const px =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 16
      : size === 'lg'
      ? 24
      : 20;
  return <BaseIcon name={name} size={px} {...rest} />;
}
