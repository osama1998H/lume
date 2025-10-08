import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import EmptyState from './EmptyState';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  key: string | number;
  mainLabel: string;
  subLabel?: string;
  category?: string;
  value: string;
  isActive?: boolean;
}

export interface ActivityListCardProps {
  title: string;
  items: ActivityItem[];
  emptyStateText?: string;
  showCategory?: boolean;
  className?: string;
}

const ActivityListCard: React.FC<ActivityListCardProps> = ({
  title,
  items,
  emptyStateText = 'No entries available',
  showCategory = true,
  className = '',
}) => {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.key}
                className="group flex justify-between items-center p-3.5 bg-muted/50 rounded-xl border border-border hover:bg-muted hover:border-border/80 transition-all duration-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {item.mainLabel}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.subLabel && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        {item.subLabel}
                        {showCategory && item.category && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{item.category}</span>
                          </>
                        )}
                      </p>
                    )}
                    {!item.subLabel && showCategory && item.category && (
                      <Badge variant="default">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="font-semibold text-primary text-lg">
                    {item.value}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Clock}
              title={emptyStateText}
              description="Get started by tracking your first activity"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityListCard;
