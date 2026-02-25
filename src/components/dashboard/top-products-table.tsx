'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { TopProduct } from '@/types';

interface Props {
  products: TopProduct[];
}

export function TopProductsTable({ products }: Props) {
  if (!products.length) {
    return <p className="text-sm text-muted-foreground">No products data available.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Product</TableHead>
          <TableHead className="text-right">Clicks</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.rank}>
            <TableCell className="font-mono text-sm">{product.rank}</TableCell>
            <TableCell>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-sm max-w-xs truncate block"
              >
                {product.title}
              </a>
            </TableCell>
            <TableCell className="text-right text-sm">{product.clicks.toLocaleString()}</TableCell>
            <TableCell className="text-right text-sm">{product.orders.toLocaleString()}</TableCell>
            <TableCell className="text-right text-sm">${product.revenue.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
