import React from 'react';
import './Table.css';

/**
 * Low-level table primitives. These are thin styled wrappers around native
 * HTML table tags so call sites keep full control over columns and cells.
 *
 * Usage:
 *   <Table>
 *     <Thead>
 *       <Tr>
 *         <Th>Name</Th>
 *         <Th align="right">Qty</Th>
 *       </Tr>
 *     </Thead>
 *     <Tbody>
 *       <Tr>
 *         <Td>Laptop</Td>
 *         <Td align="right">12</Td>
 *       </Tr>
 *     </Tbody>
 *   </Table>
 */

export function Table({ className = '', dense = false, children, ...rest }) {
  return (
    <table
      className={[
        'table',
        dense ? 'table--dense' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </table>
  );
}

export function Thead({ sticky = true, className = '', children, ...rest }) {
  return (
    <thead
      className={[
        'table__thead',
        sticky ? 'table__thead--sticky' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </thead>
  );
}

export function Tbody({ className = '', children, ...rest }) {
  return (
    <tbody className={['table__tbody', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </tbody>
  );
}

export function Tr({ className = '', children, ...rest }) {
  return (
    <tr className={['table__tr', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </tr>
  );
}

export function Th({ align = 'left', className = '', children, ...rest }) {
  return (
    <th
      scope="col"
      className={[
        'table__th',
        `table__cell--${align}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({ align = 'left', className = '', children, ...rest }) {
  return (
    <td
      className={[
        'table__td',
        `table__cell--${align}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </td>
  );
}
