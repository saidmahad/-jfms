import type { ReactNode } from 'react';
import { Card, CardHeader } from '../ui/Card.tsx';

export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="p-4">{children}</div>
    </Card>
  );
}
